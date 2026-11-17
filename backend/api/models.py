from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLES = [("student", "Student"), ("teacher", "Teacher")]
    role = models.CharField(max_length=10, choices=ROLES, default="student")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Language(models.Model):
    code = models.CharField(max_length=10, unique=True)   # e.g. "hi"
    name = models.CharField(max_length=50)                # e.g. "Hindi"
    native_name = models.CharField(max_length=50, blank=True)  # e.g. "हिन्दी"
    tts_code = models.CharField(max_length=15)            # e.g. "hi-IN"
    flag = models.CharField(max_length=10, blank=True)    # emoji flag

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    preferred_language = models.ForeignKey(Language, null=True, blank=True, on_delete=models.SET_NULL)
    bio = models.TextField(blank=True)
    website = models.URLField(blank=True)
    streak_days = models.PositiveIntegerField(default=0)
    total_watch_minutes = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Profile of {self.user.username}"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True)   # e.g. "💻"
    color = models.CharField(max_length=20, blank=True)  # Tailwind class e.g. "bg-blue-500"

    class Meta:
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Course(models.Model):
    LEVELS = [("Beginner", "Beginner"), ("Intermediate", "Intermediate"), ("Advanced", "Advanced")]
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="courses")
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="courses")
    title = models.CharField(max_length=200)
    description = models.TextField()
    thumbnail = models.URLField(blank=True)         # YouTube thumbnail or custom URL
    level = models.CharField(max_length=20, choices=LEVELS, default="Beginner")
    language = models.CharField(max_length=10, default="en")  # original course language
    tags = models.CharField(max_length=300, blank=True)       # comma-separated
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.username} → {self.course.title}"


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    youtube_id = models.CharField(max_length=20, blank=True)   # YouTube video ID
    video = models.FileField(upload_to="lectures/", blank=True)  # uploaded video
    duration_seconds = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.course.title} — {self.title}"

    @property
    def thumbnail_url(self):
        if self.youtube_id:
            return f"https://img.youtube.com/vi/{self.youtube_id}/hqdefault.jpg"
        return ""


class LessonProgress(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="progress")
    completed = models.BooleanField(default=False)
    watch_seconds = models.PositiveIntegerField(default=0)
    last_watched = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "lesson")

    def __str__(self):
        return f"{self.student.username} — {self.lesson.title} {'✓' if self.completed else '…'}"


class Transcript(models.Model):
    lesson = models.ForeignKey(Lesson, null=True, blank=True, on_delete=models.CASCADE, related_name="transcripts")
    live_class = models.ForeignKey("LiveClass", null=True, blank=True, on_delete=models.CASCADE, related_name="transcripts")
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    text = models.TextField()
    source = models.CharField(max_length=20, default="manual",
                              choices=[("manual", "Manual"), ("youtube", "YouTube"), ("stt", "Speech-to-Text")])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("lesson", "language")

    def __str__(self):
        return f"Transcript ({self.language.code}) for {self.lesson}"


class TranslatedSubtitle(models.Model):
    """Cached translated subtitle — stores both full text and JSON segments with timestamps."""
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="subtitles")
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    text = models.TextField()                         # full plain text (for TTS)
    segments_json = models.TextField(default="[]")    # JSON: [{"start": 0.0, "dur": 4.1, "text": "..."}]
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("lesson", "language")

    def __str__(self):
        return f"Subtitle ({self.language.code}) for {self.lesson}"


class TranslatedAudio(models.Model):
    """Cached translated TTS audio for a lesson + language combo."""
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="translated_audios")
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    audio_file = models.FileField(upload_to="tts_audio/")
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("lesson", "language")

    def __str__(self):
        return f"TTS Audio ({self.language.code}) for {self.lesson}"


class LiveClass(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="live_classes")
    title = models.CharField(max_length=200)
    scheduled_at = models.DateTimeField()
    is_live = models.BooleanField(default=False)
    meeting_link = models.URLField(blank=True)

    class Meta:
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"{self.course.title}: {self.title}"


# ── Legends & Life Stories ────────────────────────────────────────────────────

class LegendCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=10, blank=True)
    color = models.CharField(max_length=30, blank=True)   # CSS gradient class
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "legend categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Legend(models.Model):
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=100)
    name_hi = models.CharField(max_length=100, blank=True)   # Hindi name
    category = models.ForeignKey(LegendCategory, on_delete=models.CASCADE, related_name="legends")
    born = models.CharField(max_length=50, blank=True)
    died = models.CharField(max_length=50, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    tagline = models.CharField(max_length=200, blank=True)   # one-line summary
    tagline_hi = models.CharField(max_length=200, blank=True)
    cover_emoji = models.CharField(max_length=10, default="⭐")
    cover_color = models.CharField(max_length=50, default="from-amber-500 to-orange-600")
    # Real photograph — Wikimedia Commons / public domain URL
    photo_url = models.URLField(blank=True, max_length=500)
    photo_attribution = models.CharField(max_length=300, blank=True)
    overview = models.TextField(blank=True)
    overview_hi = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class StoryPanel(models.Model):
    """One comic panel in a legend's story."""
    PANEL_TYPES = [
        ("cover",        "Cover"),
        ("childhood",    "Childhood"),
        ("education",    "Education"),
        ("challenge",    "Challenge"),
        ("achievement",  "Achievement"),
        ("event",        "Life Event"),
        ("legacy",       "Legacy"),
        ("lesson",       "Lesson"),
    ]
    legend = models.ForeignKey(Legend, on_delete=models.CASCADE, related_name="panels")
    order = models.PositiveIntegerField(default=0)
    panel_type = models.CharField(max_length=20, choices=PANEL_TYPES, default="event")
    # English content
    title = models.CharField(max_length=200)
    narration = models.TextField()          # 2-4 sentence narrative caption
    speech_bubble = models.TextField(blank=True)   # historical quote (optional)
    # Hindi content
    title_hi = models.CharField(max_length=200, blank=True)
    narration_hi = models.TextField(blank=True)
    speech_bubble_hi = models.TextField(blank=True)
    # Visual
    emoji = models.CharField(max_length=20, default="🌟")
    bg_color = models.CharField(max_length=60, default="from-blue-500 to-purple-600")
    panel_image_url = models.URLField(blank=True, max_length=500)  # scene illustration
    year_label = models.CharField(max_length=20, blank=True)   # e.g. "1869"

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.legend.name} — Panel {self.order}: {self.title}"


class QuizQuestion(models.Model):
    legend = models.ForeignKey(Legend, on_delete=models.CASCADE, related_name="quiz")
    question = models.TextField()
    question_hi = models.TextField(blank=True)
    option_a = models.CharField(max_length=200)
    option_b = models.CharField(max_length=200)
    option_c = models.CharField(max_length=200)
    option_d = models.CharField(max_length=200)
    correct = models.CharField(max_length=1, choices=[("a","A"),("b","B"),("c","C"),("d","D")])
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.legend.name} Q{self.order}: {self.question[:50]}"


class LegendBookmark(models.Model):
    """Authenticated users can bookmark legends."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookmarks")
    legend = models.ForeignKey(Legend, on_delete=models.CASCADE, related_name="bookmarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "legend")

    def __str__(self):
        return f"{self.user.username} ♡ {self.legend.name}"


# ── Knowledge Arena ───────────────────────────────────────────────────────────

class QuizTopic(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=10, default="📚")
    color = models.CharField(max_length=50, default="from-blue-500 to-purple-600")
    description = models.TextField(blank=True)
    question_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ArenaQuestion(models.Model):
    DIFFICULTY = [("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")]
    topic = models.ForeignKey(QuizTopic, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    text_hi = models.TextField(blank=True)
    option_a = models.CharField(max_length=300)
    option_b = models.CharField(max_length=300)
    option_c = models.CharField(max_length=300)
    option_d = models.CharField(max_length=300)
    correct = models.CharField(max_length=1, choices=[("a","A"),("b","B"),("c","C"),("d","D")])
    explanation = models.TextField(blank=True)
    explanation_hi = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY, default="medium")
    is_daily = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"[{self.topic.name}] {self.text[:60]}"


class QuizAttempt(models.Model):
    """One completed quiz session by a user."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_attempts", null=True, blank=True)
    guest_id = models.CharField(max_length=64, blank=True)   # localStorage UUID for guests
    topic = models.ForeignKey(QuizTopic, on_delete=models.CASCADE, related_name="attempts")
    score = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=5)
    xp_earned = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(auto_now_add=True)
    time_taken_seconds = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-completed_at"]

    def __str__(self):
        name = self.user.username if self.user else f"guest:{self.guest_id[:8]}"
        return f"{name} — {self.topic.name} {self.score}/{self.total}"


# ── XP & Gamification ─────────────────────────────────────────────────────────

class UserXP(models.Model):
    """Single row per user tracking total XP and level."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="xp")
    total_xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    badges = models.TextField(default="[]")   # JSON list of badge slugs

    def __str__(self):
        return f"{self.user.username}: {self.total_xp} XP (Lv{self.level})"

    def add_xp(self, amount: int):
        self.total_xp += amount
        # Level up every 500 XP
        self.level = max(1, self.total_xp // 500 + 1)
        self.save(update_fields=["total_xp", "level"])
        return self.total_xp


# ── Career Compass ────────────────────────────────────────────────────────────

class CareerPath(models.Model):
    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default="💻")
    color = models.CharField(max_length=60, default="from-blue-500 to-purple-600")
    overview = models.TextField()
    avg_salary = models.CharField(max_length=50, blank=True)
    demand = models.CharField(max_length=20, default="High")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class RoadmapStage(models.Model):
    STAGES = [("beginner", "Beginner"), ("intermediate", "Intermediate"), ("advanced", "Advanced")]
    path = models.ForeignKey(CareerPath, on_delete=models.CASCADE, related_name="stages")
    stage = models.CharField(max_length=20, choices=STAGES)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    duration = models.CharField(max_length=50, blank=True)   # e.g. "2-3 months"
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.path.title} — {self.stage}: {self.title}"


class RoadmapSkill(models.Model):
    stage = models.ForeignKey(RoadmapStage, on_delete=models.CASCADE, related_name="skills")
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, blank=True)   # e.g. "Language", "Framework"
    is_core = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.stage} — {self.name}"


class SkillProgress(models.Model):
    """Track which skills a user has marked complete."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="skill_progress")
    skill = models.ForeignKey(RoadmapSkill, on_delete=models.CASCADE, related_name="completions")
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "skill")

    def __str__(self):
        return f"{self.user.username} — {self.skill.name} {'✓' if self.completed else '○'}"
