from rest_framework import serializers
from .models import (User, UserProfile, Language, Category, Course, Enrollment,
                     Lesson, LessonProgress, Transcript, TranslatedSubtitle,
                     TranslatedAudio, LiveClass)


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=False, allow_blank=True, default="")

    class Meta:
        model = User
        fields = ["username", "email", "password", "role"]

    def create(self, data):
        user = User.objects.create_user(
            username=data["username"],
            password=data["password"],
            email=data.get("email", ""),
            role=data.get("role", "student"),
        )
        UserProfile.objects.get_or_create(
            user=user,
            defaults={"preferred_language": Language.objects.filter(code="en").first()},
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    preferred_language = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "preferred_language", "avatar_url"]

    def get_preferred_language(self, obj):
        try:
            lang = obj.profile.preferred_language
            if lang:
                return {"code": lang.code, "name": lang.name, "flag": lang.flag}
        except UserProfile.DoesNotExist:
            pass
        return None

    def get_avatar_url(self, obj):
        try:
            if obj.avatar:
                request = self.context.get("request")
                return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        except Exception:
            pass
        return None


# ── Language ──────────────────────────────────────────────────────────────────

class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = "__all__"


# ── Category ──────────────────────────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon", "color", "course_count"]

    def get_course_count(self, obj):
        return obj.courses.filter(is_published=True).count()


# ── Lesson ────────────────────────────────────────────────────────────────────

class LessonSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ["id", "course", "title", "description", "youtube_id",
                  "duration_seconds", "order", "thumbnail_url", "video_url"]

    def get_thumbnail_url(self, obj):
        return obj.thumbnail_url

    def get_video_url(self, obj):
        if obj.video:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.video.url) if request else obj.video.url
        return None


# ── LiveClass ─────────────────────────────────────────────────────────────────

class LiveClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveClass
        fields = "__all__"


# ── Course ────────────────────────────────────────────────────────────────────

class CourseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer used in list/search views."""
    teacher_name = serializers.CharField(source="teacher.username", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    category_icon = serializers.CharField(source="category.icon", read_only=True, default="")
    student_count = serializers.IntegerField(source="enrollments.count", read_only=True)
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ["id", "title", "description", "thumbnail", "level", "language",
                  "teacher_name", "category_name", "category_icon",
                  "student_count", "lesson_count", "tags", "created_at"]

    def get_lesson_count(self, obj):
        return obj.lessons.count()


class CourseDetailSerializer(CourseListSerializer):
    """Full serializer with nested lessons and live classes."""
    lessons = LessonSerializer(many=True, read_only=True)
    live_classes = LiveClassSerializer(many=True, read_only=True)

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + ["lessons", "live_classes", "updated_at"]


class CourseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["title", "description", "thumbnail", "level", "language",
                  "category", "tags", "is_published"]


# ── Progress ──────────────────────────────────────────────────────────────────

class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ["id", "lesson", "completed", "watch_seconds", "last_watched"]


# ── Transcript / Subtitle / Audio ─────────────────────────────────────────────

class TranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = "__all__"


class TranslatedSubtitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranslatedSubtitle
        fields = "__all__"


class TranslatedAudioSerializer(serializers.ModelSerializer):
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = TranslatedAudio
        fields = ["id", "lesson", "language", "audio_url", "generated_at"]

    def get_audio_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.audio_file.url) if request else obj.audio_file.url
