from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from . import models as m


@admin.register(m.User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "role", "is_staff"]
    list_filter = ["role", "is_staff"]
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role", "avatar")}),)


@admin.register(m.Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "teacher", "category", "level", "is_published", "created_at"]
    list_filter = ["category", "level", "is_published"]
    search_fields = ["title", "teacher__username"]


@admin.register(m.Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ["title", "course", "order", "youtube_id"]
    list_filter = ["course"]
    search_fields = ["title", "youtube_id"]


@admin.register(m.LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ["student", "lesson", "completed", "watch_seconds", "last_watched"]
    list_filter = ["completed"]


for model in (m.Language, m.UserProfile, m.Category, m.Enrollment,
              m.LiveClass, m.Transcript, m.TranslatedSubtitle, m.TranslatedAudio):
    admin.site.register(model)
