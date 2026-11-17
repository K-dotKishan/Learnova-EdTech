from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

router = DefaultRouter()
router.register("courses", views.CourseViewSet, "course")
router.register("lessons", views.LessonViewSet, "lesson")
router.register("live-classes", views.LiveClassViewSet, "liveclass")
router.register("languages", views.LanguageViewSet, "language")
router.register("categories", views.CategoryViewSet, "category")

urlpatterns = [
    path("auth/register/", views.Register.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", views.me),
    path("dashboard/", views.dashboard),
    path("translation-status/", views.translation_status),
    # Legends & Life Stories
    path("legends/categories/", views.legend_categories),
    path("legends/me/bookmarks/", views.my_bookmarks),
    path("legends/", views.legend_list),
    path("legends/<slug:slug>/", views.legend_detail),
    path("legends/<slug:slug>/bookmark/", views.legend_bookmark),
    # Knowledge Arena
    path("arena/topics/", views.arena_topics),
    path("arena/topics/<slug:slug>/questions/", views.arena_questions),
    path("arena/submit/", views.arena_submit),
    path("arena/leaderboard/", views.arena_leaderboard),
    path("arena/stats/", views.arena_my_stats),
    # Career Compass — specific paths before slug patterns
    path("careers/skills/<int:skill_id>/toggle/", views.career_toggle_skill),
    path("careers/", views.career_list),
    path("careers/<slug:slug>/progress/", views.career_progress),
    path("careers/<slug:slug>/", views.career_detail),
    path("", include(router.urls)),
]
