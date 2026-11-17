import os
import json
import logging
from django.core.files.base import ContentFile
from django.db.models import Q
from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import (User, UserProfile, Language, Category, Course, Enrollment,
                     Lesson, LessonProgress, Transcript, TranslatedSubtitle,
                     TranslatedAudio, LiveClass)
from .serializers import (RegisterSerializer, UserSerializer, LanguageSerializer,
                           CategorySerializer, CourseListSerializer, CourseDetailSerializer,
                           CourseWriteSerializer, LessonSerializer, LessonProgressSerializer,
                           LiveClassSerializer, TranscriptSerializer,
                           TranslatedSubtitleSerializer, TranslatedAudioSerializer)
from . import services

logger = logging.getLogger(__name__)


def _merge_caption_segments(segments: list[dict], target_duration: float = 8.0) -> list[dict]:
    """
    Merge YouTube caption fragments into display-friendly blocks.

    YouTube auto-captions often emit 1-3 word fragments every 1-2 seconds.
    Translating 2000+ individual fragments would take minutes.
    This merges them into ~8-second blocks which:
    - Reduces API calls by ~6-8× (from ~2000 to ~200-300)
    - Gives full-sentence context to the translator (better quality)
    - Still preserves original start timestamps for sync

    Returns merged list: [{"start": float, "dur": float, "text": str}]
    """
    if not segments:
        return []

    merged = []
    current_start = segments[0]["start"]
    current_dur = 0.0
    current_texts = []

    for seg in segments:
        current_texts.append(seg["text"])
        current_dur = (seg["start"] + seg.get("dur", 2.0)) - current_start

        # Flush when we've accumulated enough duration OR enough words
        word_count = sum(len(t.split()) for t in current_texts)
        if current_dur >= target_duration or word_count >= 25:
            merged.append({
                "start": round(current_start, 2),
                "dur": round(current_dur, 2),
                "text": " ".join(current_texts).strip(),
            })
            # Start next group at the end of this one
            next_start = seg["start"] + seg.get("dur", 2.0)
            current_start = next_start
            current_dur = 0.0
            current_texts = []

    # Flush remainder
    if current_texts:
        merged.append({
            "start": round(current_start, 2),
            "dur": round(current_dur, 2) if current_dur > 0 else 3.0,
            "text": " ".join(current_texts).strip(),
        })

    return merged


# ── Permissions ───────────────────────────────────────────────────────────────

class IsTeacher(permissions.BasePermission):
    def has_permission(self, r, v):
        return r.user.is_authenticated and r.user.role == "teacher"


class IsTeacherOrReadOnly(permissions.BasePermission):
    def has_permission(self, r, v):
        return r.method in permissions.SAFE_METHODS or (
            r.user.is_authenticated and r.user.role == "teacher"
        )


# ── Auth ──────────────────────────────────────────────────────────────────────

class Register(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        lang_code = request.data.get("preferred_language")
        if lang_code:
            lang = Language.objects.filter(code=lang_code).first()
            p, _ = UserProfile.objects.get_or_create(user=request.user)
            if lang:
                p.preferred_language = lang
                p.save()
        bio = request.data.get("bio")
        website = request.data.get("website")
        if bio is not None or website is not None:
            p, _ = UserProfile.objects.get_or_create(user=request.user)
            if bio is not None:
                p.bio = bio
            if website is not None:
                p.website = website
            p.save()
    return Response(UserSerializer(request.user, context={"request": request}).data)


# ── Languages ─────────────────────────────────────────────────────────────────

class LanguageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Language.objects.all().order_by("name")
    serializer_class = LanguageSerializer
    permission_classes = [permissions.AllowAny]


# ── Categories ────────────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


# ── Courses ───────────────────────────────────────────────────────────────────

class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsTeacherOrReadOnly]

    def get_queryset(self):
        qs = Course.objects.filter(is_published=True).select_related("teacher", "category").prefetch_related("enrollments")
        if self.request.query_params.get("mine") and self.request.user.is_authenticated:
            u = self.request.user
            if u.role == "teacher":
                qs = Course.objects.filter(teacher=u).select_related("teacher", "category")
            else:
                qs = Course.objects.filter(enrollments__student=u).select_related("teacher", "category")
        cat = self.request.query_params.get("category")
        if cat:
            qs = qs.filter(category__slug=cat)
        level = self.request.query_params.get("level")
        if level:
            qs = qs.filter(level=level)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(tags__icontains=q))
        return qs

    def get_serializer_class(self):
        if self.action in ("list",):
            return CourseListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CourseWriteSerializer
        return CourseDetailSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, s):
        s.save(teacher=self.request.user)

    def update(self, request, *a, **k):
        if self.get_object().teacher != request.user:
            return Response({"detail": "Not your course."}, status=403)
        return super().update(request, *a, **k)

    def destroy(self, request, *a, **k):
        if self.get_object().teacher != request.user:
            return Response({"detail": "Not your course."}, status=403)
        return super().destroy(request, *a, **k)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, pk=None):
        course = self.get_object()
        enr, created = Enrollment.objects.get_or_create(student=request.user, course=course)
        return Response({"enrolled": True, "new": created})

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request, pk=None):
        c = self.get_object()
        if c.teacher != request.user:
            return Response({"detail": "Not your course."}, status=403)
        return Response({
            "students": c.enrollments.count(),
            "lessons": c.lessons.count(),
            "live_classes": c.live_classes.count(),
            "completions": LessonProgress.objects.filter(lesson__course=c, completed=True).count(),
            "roster": list(c.enrollments.values_list("student__username", flat=True)),
        })

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def progress(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({})
        course = self.get_object()
        lessons = course.lessons.all()
        prog = {
            lp.lesson_id: {"completed": lp.completed, "watch_seconds": lp.watch_seconds}
            for lp in LessonProgress.objects.filter(student=request.user, lesson__course=course)
        }
        total = lessons.count()
        done = sum(1 for v in prog.values() if v["completed"])
        return Response({
            "total_lessons": total,
            "completed_lessons": done,
            "percent": round(done / total * 100) if total else 0,
            "lessons": {str(l.id): prog.get(l.id, {"completed": False, "watch_seconds": 0}) for l in lessons},
        })


# ── Lessons ───────────────────────────────────────────────────────────────────

class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all().select_related("course")
    serializer_class = LessonSerializer
    permission_classes = [IsTeacherOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def complete(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"ok": True, "saved": False, "reason": "guest"})
        lesson = self.get_object()
        watch = int(request.data.get("watch_seconds", 0))
        LessonProgress.objects.update_or_create(
            student=request.user, lesson=lesson,
            defaults={"completed": True, "watch_seconds": watch},
        )
        try:
            profile = request.user.profile
            profile.total_watch_minutes += watch // 60
            profile.save(update_fields=["total_watch_minutes"])
        except Exception:
            pass
        return Response({"ok": True, "saved": True})

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def progress_update(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"ok": True, "saved": False, "reason": "guest"})
        lesson = self.get_object()
        watch = int(request.data.get("watch_seconds", 0))
        LessonProgress.objects.update_or_create(
            student=request.user, lesson=lesson,
            defaults={"watch_seconds": watch},
        )
        return Response({"ok": True, "saved": True})

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.AllowAny])
    def transcript(self, request, pk=None):
        """
        GET  ?lang=hi  →  Auto-fetch English captions from YouTube (with timestamps),
                          batch-translate all segments to requested language,
                          cache result, return timestamped segments + full text.
                          Works for guests (no auth required).
        POST            →  Teacher saves English source transcript (plain text or SRT/VTT).
        """
        lesson = self.get_object()
        en, _ = Language.objects.get_or_create(
            code="en", defaults={"name": "English", "tts_code": "en-US", "flag": "🇬🇧"}
        )

        # ── POST: teacher uploads transcript ─────────────────────────────
        if request.method == "POST":
            if not request.user.is_authenticated or request.user.role != "teacher":
                return Response({"detail": "Teachers only."}, status=403)
            text = request.data.get("text", "").strip()
            srt_content = request.data.get("srt", "")
            vtt_content = request.data.get("vtt", "")

            if srt_content:
                segments = services.parse_srt(srt_content)
                text = " ".join(s["text"] for s in segments)
            elif vtt_content:
                segments = services.parse_vtt(vtt_content)
                text = " ".join(s["text"] for s in segments)
            elif text:
                segments = [{"start": 0, "dur": 0, "text": text}]
            else:
                return Response({"detail": "text, srt, or vtt is required."}, status=400)

            Transcript.objects.update_or_create(
                lesson=lesson, language=en,
                defaults={"text": text, "source": "manual"},
            )
            TranslatedSubtitle.objects.filter(lesson=lesson).delete()
            return Response({
                "text": text,
                "segments": segments,
                "source": "manual",
                "segments_count": len(segments),
            }, status=201)

        # ── GET ──────────────────────────────────────────────────────────
        lang_code = request.query_params.get("lang", "en")
        lang_obj = Language.objects.filter(code=lang_code).first()
        if not lang_obj:
            return Response({"detail": f"Language '{lang_code}' is not configured on this server."}, status=404)

        # 1. Check translation cache (includes segments_json)
        if lang_code != "en":
            cached = TranslatedSubtitle.objects.filter(lesson=lesson, language=lang_obj).first()
            if cached and cached.segments_json:
                return Response({
                    "language": lang_code,
                    "text": cached.text,
                    "segments": json.loads(cached.segments_json),
                    "cached": True,
                })

        # 2. Ensure we have an English source transcript
        src = Transcript.objects.filter(lesson=lesson, language=en).first()
        if not src and lesson.youtube_id:
            logger.info("Auto-fetching YouTube captions for lesson %s (video %s)", lesson.id, lesson.youtube_id)
            segments = services.fetch_youtube_captions(lesson.youtube_id)
            if segments:
                full_text = " ".join(s["text"] for s in segments)
                src = Transcript.objects.create(
                    lesson=lesson, language=en, text=full_text, source="youtube"
                )
                logger.info("Saved %d YouTube caption segments for lesson %s", len(segments), lesson.id)

        if not src:
            return Response({
                "detail": (
                    "No transcript available for this video. "
                    "This video may not have public captions enabled on YouTube. "
                    "A teacher can add a manual transcript or upload an SRT/VTT file."
                ),
                "no_transcript": True,
            }, status=404)

        # 3. English requested → return merged segments with timestamps
        if lang_code == "en":
            if lesson.youtube_id:
                en_segments = services.fetch_youtube_captions(lesson.youtube_id)
                if en_segments:
                    merged = _merge_caption_segments(en_segments, target_duration=8.0)
                    return Response({
                        "language": "en",
                        "text": " ".join(s["text"] for s in merged),
                        "segments": merged,
                        "cached": False,
                        "source": "youtube",
                    })
            return Response({
                "language": "en",
                "text": src.text,
                "segments": [{"start": 0, "dur": 0, "text": src.text}],
                "cached": True,
                "source": src.source,
            })

        # 4. Non-English: fetch English segments, batch-translate
        en_segments = None
        if lesson.youtube_id:
            en_segments = services.fetch_youtube_captions(lesson.youtube_id)
        if not en_segments:
            en_segments = [{"start": 0, "dur": 0, "text": src.text}]

        # YouTube caption files can have 2000+ tiny segments (1-3 words each).
        # Translating all individually would take minutes.
        # Strategy: merge adjacent segments into ~8-second display blocks,
        # translate those merged blocks, then return them as the subtitle track.
        merged = _merge_caption_segments(en_segments, target_duration=8.0)
        chunk_texts = [s["text"] for s in merged]

        try:
            translated_texts = services.translate_chunks(chunk_texts, target=lang_code, source="en")
        except services.GoogleNotConfigured as e:
            return Response({
                "detail": str(e),
                "google_not_configured": True,
            }, status=503)
        except Exception as e:
            logger.error("Translation error for lesson %s lang %s: %s", lesson.id, lang_code, e)
            return Response({"detail": f"Translation error: {e}"}, status=503)

        # Build translated segments with original timestamps preserved
        translated_segments = []
        for i, seg in enumerate(merged):
            translated_segments.append({
                "start": seg["start"],
                "dur": seg["dur"],
                "text": translated_texts[i],
            })

        full_translated_text = " ".join(s["text"] for s in translated_segments)

        # 5. Cache translated result with segments
        TranslatedSubtitle.objects.update_or_create(
            lesson=lesson, language=lang_obj,
            defaults={
                "text": full_translated_text,
                "segments_json": json.dumps(translated_segments),
            },
        )

        return Response({
            "language": lang_code,
            "text": full_translated_text,
            "segments": translated_segments,
            "cached": False,
            "segment_count": len(translated_segments),
        })

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def translated_audio(self, request, pk=None):
        """
        GET ?lang=hi
        Returns URL to cached TTS MP3. Generates on-demand if not cached.
        Works for guests (no auth required).
        """
        lesson = self.get_object()
        lang_code = request.query_params.get("lang", "en")
        lang_obj = Language.objects.filter(code=lang_code).first()
        if not lang_obj:
            return Response({"detail": f"Language '{lang_code}' is not configured."}, status=404)

        cached = TranslatedAudio.objects.filter(lesson=lesson, language=lang_obj).first()
        if cached:
            url = request.build_absolute_uri(cached.audio_file.url)
            return Response({"language": lang_code, "audio_url": url, "cached": True})

        en, _ = Language.objects.get_or_create(
            code="en", defaults={"name": "English", "tts_code": "en-US", "flag": "🇬🇧"}
        )
        src = Transcript.objects.filter(lesson=lesson, language=en).first()
        if not src and lesson.youtube_id:
            segments = services.fetch_youtube_captions(lesson.youtube_id)
            if segments:
                full_text = " ".join(s["text"] for s in segments)
                src = Transcript.objects.create(lesson=lesson, language=en, text=full_text, source="youtube")

        if not src:
            return Response({
                "detail": (
                    "Cannot generate audio: no transcript available for this video. "
                    "Enable YouTube captions or add a manual transcript first."
                ),
                "no_transcript": True,
            }, status=404)

        try:
            if lang_code != "en":
                text = services.translate(src.text, target=lang_code, source="en")
            else:
                text = src.text
            audio_bytes = services.text_to_speech(text[:4800], lang_obj.tts_code)
        except services.GoogleNotConfigured:
            return Response({
                "detail": (
                    "Dubbed audio requires Google Cloud Text-to-Speech. "
                    "Subtitles and translations are available without credentials. "
                    "See setup instructions at /api/translation-status/ ."
                ),
                "tts_not_configured": True,
            }, status=503)
        except Exception as e:
            logger.error("TTS error for lesson %s lang %s: %s", lesson.id, lang_code, e)
            return Response({"detail": f"Audio generation error: {e}"}, status=503)

        filename = f"tts_{lesson.id}_{lang_code}.mp3"
        ta = TranslatedAudio(lesson=lesson, language=lang_obj)
        ta.audio_file.save(filename, ContentFile(audio_bytes), save=True)

        url = request.build_absolute_uri(ta.audio_file.url)
        return Response({"language": lang_code, "audio_url": url, "cached": False})


# ── Live Classes ──────────────────────────────────────────────────────────────

class LiveClassViewSet(viewsets.ModelViewSet):
    queryset = LiveClass.objects.all().select_related("course")
    serializer_class = LiveClassSerializer
    permission_classes = [IsTeacherOrReadOnly]


# ── Translation status endpoint ───────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def translation_status(request):
    """
    Returns which translation features are available.
    Subtitles use MyMemory API (free, always available).
    TTS/dubbing requires Google Cloud credentials.
    """
    google_ok = services._google_configured()
    return Response({
        "subtitles_available": True,
        "subtitles_provider": "Google Cloud Translation" if google_ok else "MyMemory API (free fallback)",
        "tts_available": google_ok,
        "tts_provider": "Google Cloud Text-to-Speech" if google_ok else None,
        "google_configured": google_ok,
        "setup_required": [] if google_ok else [
            "To enable dubbed audio (TTS), set up Google Cloud credentials:",
            "1. Go to https://console.cloud.google.com/",
            "2. Create a project (or use existing)",
            "3. Enable: Cloud Translation API + Cloud Text-to-Speech API",
            "4. Create a Service Account, download the JSON key",
            "5. Set GOOGLE_APPLICATION_CREDENTIALS=C:\\full\\path\\to\\key.json in backend/.env",
            "6. Restart the Django server",
            "Subtitles and translations work right now without any setup.",
        ],
    })



@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard(request):
    user = request.user
    if user.role == "teacher":
        my_courses = Course.objects.filter(teacher=user).prefetch_related("enrollments", "lessons")
        total_students = sum(c.enrollments.count() for c in my_courses)
        return Response({
            "role": "teacher",
            "courses_count": my_courses.count(),
            "total_students": total_students,
            "courses": CourseListSerializer(my_courses, many=True, context={"request": request}).data,
        })

    enrollments = Enrollment.objects.filter(student=user).select_related("course__teacher", "course__category")
    courses = [e.course for e in enrollments]
    course_data = []
    for course in courses:
        total = course.lessons.count()
        done = LessonProgress.objects.filter(student=user, lesson__course=course, completed=True).count()
        course_data.append({
            **CourseListSerializer(course, context={"request": request}).data,
            "progress_percent": round(done / total * 100) if total else 0,
            "completed_lessons": done,
        })

    recent = (LessonProgress.objects.filter(student=user)
              .select_related("lesson__course")
              .order_by("-last_watched")[:5])
    recent_data = [{
        "lesson_id": lp.lesson_id,
        "lesson_title": lp.lesson.title,
        "course_id": lp.lesson.course_id,
        "course_title": lp.lesson.course.title,
        "watch_seconds": lp.watch_seconds,
        "completed": lp.completed,
    } for lp in recent]

    try:
        profile = user.profile
        watch_minutes = profile.total_watch_minutes
    except Exception:
        watch_minutes = 0

    return Response({
        "role": "student",
        "enrolled_courses": len(courses),
        "total_watch_minutes": watch_minutes,
        "courses": course_data,
        "recent_lessons": recent_data,
    })


# ── Legends & Life Stories ────────────────────────────────────────────────────

from .models import LegendCategory, Legend, StoryPanel, QuizQuestion, LegendBookmark


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def legend_categories(request):
    cats = LegendCategory.objects.all()
    data = [
        {
            "id": c.id, "name": c.name, "slug": c.slug,
            "icon": c.icon, "color": c.color, "description": c.description,
            "legend_count": c.legends.filter(is_published=True).count(),
        }
        for c in cats
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def legend_list(request):
    """
    List all published legends.
    ?category=indian-legends  — filter by category slug
    ?q=gandhi                 — search by name
    """
    qs = Legend.objects.filter(is_published=True).select_related("category")
    cat = request.query_params.get("category")
    q = request.query_params.get("q")
    if cat:
        qs = qs.filter(category__slug=cat)
    if q:
        qs = qs.filter(name__icontains=q)

    # Collect bookmark ids for authenticated user
    bookmarked_ids = set()
    if request.user.is_authenticated:
        bookmarked_ids = set(
            LegendBookmark.objects.filter(user=request.user).values_list("legend_id", flat=True)
        )

    data = [
        {
            "id": l.id, "slug": l.slug, "name": l.name, "name_hi": l.name_hi,
            "category": l.category.name, "category_slug": l.category.slug,
            "category_icon": l.category.icon,
            "born": l.born, "died": l.died, "nationality": l.nationality,
            "tagline": l.tagline, "tagline_hi": l.tagline_hi,
            "cover_emoji": l.cover_emoji, "cover_color": l.cover_color,
            "photo_url": l.photo_url,
            "photo_attribution": l.photo_attribution,
            "panel_count": l.panels.count(),
            "has_quiz": l.quiz.exists(),
            "is_bookmarked": l.id in bookmarked_ids,
        }
        for l in qs
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def legend_detail(request, slug):
    """Full story with all panels and quiz for one legend."""
    try:
        legend = Legend.objects.get(slug=slug, is_published=True)
    except Legend.DoesNotExist:
        return Response({"detail": "Legend not found."}, status=404)

    panels = legend.panels.all()
    quiz = legend.quiz.all()

    is_bookmarked = False
    if request.user.is_authenticated:
        is_bookmarked = LegendBookmark.objects.filter(user=request.user, legend=legend).exists()

    panels_data = [
        {
            "id": p.id, "order": p.order, "panel_type": p.panel_type,
            "title": p.title, "title_hi": p.title_hi,
            "narration": p.narration, "narration_hi": p.narration_hi,
            "speech_bubble": p.speech_bubble, "speech_bubble_hi": p.speech_bubble_hi,
            "emoji": p.emoji, "bg_color": p.bg_color,
            "panel_image_url": p.panel_image_url,
            "year_label": p.year_label,
        }
        for p in panels
    ]
    quiz_data = [
        {
            "id": q.id, "order": q.order,
            "question": q.question, "question_hi": q.question_hi,
            "options": {"a": q.option_a, "b": q.option_b, "c": q.option_c, "d": q.option_d},
            "correct": q.correct, "explanation": q.explanation,
        }
        for q in quiz
    ]

    return Response({
        "id": legend.id, "slug": legend.slug,
        "name": legend.name, "name_hi": legend.name_hi,
        "category": legend.category.name, "category_slug": legend.category.slug,
        "born": legend.born, "died": legend.died, "nationality": legend.nationality,
        "tagline": legend.tagline, "tagline_hi": legend.tagline_hi,
        "cover_emoji": legend.cover_emoji, "cover_color": legend.cover_color,
        "photo_url": legend.photo_url,
        "photo_attribution": legend.photo_attribution,
        "overview": legend.overview, "overview_hi": legend.overview_hi,
        "panels": panels_data,
        "quiz": quiz_data,
        "is_bookmarked": is_bookmarked,
    })


@api_view(["POST", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def legend_bookmark(request, slug):
    """Toggle bookmark for a legend."""
    try:
        legend = Legend.objects.get(slug=slug)
    except Legend.DoesNotExist:
        return Response({"detail": "Legend not found."}, status=404)

    if request.method == "POST":
        LegendBookmark.objects.get_or_create(user=request.user, legend=legend)
        return Response({"bookmarked": True})
    else:
        LegendBookmark.objects.filter(user=request.user, legend=legend).delete()
        return Response({"bookmarked": False})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_bookmarks(request):
    """Return all bookmarked legends for the current user."""
    bookmarks = LegendBookmark.objects.filter(user=request.user).select_related("legend__category")
    data = [
        {
            "slug": b.legend.slug, "name": b.legend.name,
            "cover_emoji": b.legend.cover_emoji, "cover_color": b.legend.cover_color,
            "category": b.legend.category.name, "tagline": b.legend.tagline,
        }
        for b in bookmarks
    ]
    return Response(data)


# ── Knowledge Arena ───────────────────────────────────────────────────────────

from .models import QuizTopic, ArenaQuestion, QuizAttempt, UserXP
import json as _json
from datetime import date as _date


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def arena_topics(request):
    topics = QuizTopic.objects.all()
    data = [{"id": t.id, "name": t.name, "slug": t.slug, "icon": t.icon,
             "color": t.color, "description": t.description,
             "question_count": ArenaQuestion.objects.filter(topic=t).count()} for t in topics]
    return Response(data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def arena_questions(request, slug):
    try:
        topic = QuizTopic.objects.get(slug=slug)
    except QuizTopic.DoesNotExist:
        return Response({"detail": "Topic not found."}, status=404)
    daily = request.query_params.get("daily") == "1"
    qs = ArenaQuestion.objects.filter(topic=topic)
    if daily:
        qs = qs.filter(is_daily=True)
    # Return up to 10 questions, randomised
    questions = list(qs.order_by("?")[:10])
    data = [{
        "id": q.id, "text": q.text, "text_hi": q.text_hi,
        "options": {"a": q.option_a, "b": q.option_b, "c": q.option_c, "d": q.option_d},
        "difficulty": q.difficulty,
    } for q in questions]
    return Response({"topic": topic.name, "slug": topic.slug, "questions": data})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def arena_submit(request):
    """
    Submit answers for a quiz attempt.
    Body: { topic_slug, answers: [{question_id, answer}], time_taken_seconds, guest_id? }
    Returns: { score, total, xp_earned, correct_answers: [{id, correct, explanation}] }
    """
    topic_slug = request.data.get("topic_slug")
    answers = request.data.get("answers", [])
    time_taken = int(request.data.get("time_taken_seconds", 0))
    guest_id = request.data.get("guest_id", "")

    try:
        topic = QuizTopic.objects.get(slug=topic_slug)
    except QuizTopic.DoesNotExist:
        return Response({"detail": "Invalid topic."}, status=400)

    score = 0
    total = len(answers)
    correct_data = []

    for ans in answers:
        qid = ans.get("question_id")
        user_ans = ans.get("answer", "").lower()
        try:
            q = ArenaQuestion.objects.get(id=qid, topic=topic)
            is_correct = q.correct == user_ans
            if is_correct:
                score += 1
            correct_data.append({
                "id": qid,
                "correct": q.correct,
                "is_correct": is_correct,
                "explanation": q.explanation,
                "explanation_hi": q.explanation_hi,
            })
        except ArenaQuestion.DoesNotExist:
            pass

    # Calculate XP: 20 XP per correct answer, bonus 50 if perfect
    xp_earned = score * 20
    if score == total and total > 0:
        xp_earned += 50

    # Save attempt and award XP
    attempt_kwargs = {"topic": topic, "score": score, "total": total,
                      "xp_earned": xp_earned, "time_taken_seconds": time_taken}
    if request.user.is_authenticated:
        attempt_kwargs["user"] = request.user
        # Update or create UserXP
        xp_obj, _ = UserXP.objects.get_or_create(user=request.user)
        xp_obj.add_xp(xp_earned)
    else:
        attempt_kwargs["guest_id"] = guest_id

    QuizAttempt.objects.create(**attempt_kwargs)

    return Response({
        "score": score, "total": total, "xp_earned": xp_earned,
        "correct_answers": correct_data,
        "accuracy": round(score / total * 100) if total else 0,
    })


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def arena_leaderboard(request):
    """Top 20 users by total XP."""
    top = UserXP.objects.select_related("user").order_by("-total_xp")[:20]
    data = [{"rank": i + 1, "username": x.user.username,
             "total_xp": x.total_xp, "level": x.level} for i, x in enumerate(top)]
    return Response(data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def arena_my_stats(request):
    xp_obj, _ = UserXP.objects.get_or_create(user=request.user)
    attempts = QuizAttempt.objects.filter(user=request.user)
    total_attempts = attempts.count()
    total_correct = sum(a.score for a in attempts)
    total_q = sum(a.total for a in attempts)
    return Response({
        "total_xp": xp_obj.total_xp,
        "level": xp_obj.level,
        "total_attempts": total_attempts,
        "total_correct": total_correct,
        "total_questions": total_q,
        "accuracy": round(total_correct / total_q * 100) if total_q else 0,
    })


# ── Career Compass ────────────────────────────────────────────────────────────

from .models import CareerPath, RoadmapStage, RoadmapSkill, SkillProgress
from django.utils import timezone as _tz


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def career_list(request):
    paths = CareerPath.objects.all()
    data = [{"id": p.id, "slug": p.slug, "title": p.title, "icon": p.icon,
             "color": p.color, "overview": p.overview,
             "avg_salary": p.avg_salary, "demand": p.demand} for p in paths]
    return Response(data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def career_detail(request, slug):
    try:
        path = CareerPath.objects.prefetch_related("stages__skills").get(slug=slug)
    except CareerPath.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    # Get completed skill IDs for this user
    completed_ids = set()
    if request.user.is_authenticated:
        completed_ids = set(SkillProgress.objects.filter(
            user=request.user, skill__stage__path=path, completed=True
        ).values_list("skill_id", flat=True))

    stages_data = []
    for stage in path.stages.all():
        skills_data = [{
            "id": s.id, "name": s.name, "category": s.category,
            "is_core": s.is_core, "completed": s.id in completed_ids,
        } for s in stage.skills.all()]
        stages_data.append({
            "id": stage.id, "stage": stage.stage, "title": stage.title,
            "description": stage.description, "duration": stage.duration,
            "skills": skills_data,
        })

    return Response({
        "id": path.id, "slug": path.slug, "title": path.title,
        "icon": path.icon, "color": path.color, "overview": path.overview,
        "avg_salary": path.avg_salary, "demand": path.demand,
        "stages": stages_data,
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def career_toggle_skill(request, skill_id):
    try:
        skill = RoadmapSkill.objects.get(id=skill_id)
    except RoadmapSkill.DoesNotExist:
        return Response({"detail": "Skill not found."}, status=404)

    if not request.user.is_authenticated:
        # For guests, just acknowledge — frontend saves in localStorage
        return Response({"saved": False, "reason": "guest"})

    sp, created = SkillProgress.objects.get_or_create(user=request.user, skill=skill)
    sp.completed = not sp.completed
    sp.completed_at = _tz.now() if sp.completed else None
    sp.save()

    # Award XP for completing a core skill
    if sp.completed and skill.is_core:
        xp_obj, _ = UserXP.objects.get_or_create(user=request.user)
        xp_obj.add_xp(10)

    return Response({"completed": sp.completed, "saved": True})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def career_progress(request, slug):
    try:
        path = CareerPath.objects.get(slug=slug)
    except CareerPath.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    total_skills = RoadmapSkill.objects.filter(stage__path=path).count()
    if not request.user.is_authenticated or total_skills == 0:
        return Response({"total": total_skills, "completed": 0, "percent": 0})

    done = SkillProgress.objects.filter(
        user=request.user, skill__stage__path=path, completed=True
    ).count()
    return Response({
        "total": total_skills,
        "completed": done,
        "percent": round(done / total_skills * 100),
    })
