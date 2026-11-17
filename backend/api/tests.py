from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import User, Language, Course, Category, Enrollment, Lesson, LessonProgress, Transcript


class ApiTests(TestCase):
    def setUp(self):
        Language.objects.create(code="en", name="English", tts_code="en-US", flag="🇬🇧")
        Language.objects.create(code="hi", name="Hindi",   tts_code="hi-IN", flag="🇮🇳")
        Category.objects.create(name="Programming", slug="programming")
        self.client = APIClient()

    def _register_and_login(self, username, role):
        self.client.post(
            "/api/auth/register/",
            {"username": username, "password": "secret123", "role": role},
            format="json",
        )
        resp = self.client.post(
            "/api/auth/login/",
            {"username": username, "password": "secret123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, f"Login failed for {username}")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    # ── Auth ──────────────────────────────────────────────────────────────────

    def test_register_and_login(self):
        resp = self.client.post(
            "/api/auth/register/",
            {"username": "newuser", "password": "pass123", "role": "student"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        login = self.client.post(
            "/api/auth/login/",
            {"username": "newuser", "password": "pass123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("access", login.data)

    def test_me_endpoint(self):
        self._register_and_login("meuser", "student")
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["username"], "meuser")
        self.assertEqual(resp.data["role"], "student")

    # ── Permissions ───────────────────────────────────────────────────────────

    def test_student_cannot_create_course(self):
        self._register_and_login("stu", "student")
        resp = self.client.post(
            "/api/courses/",
            {"title": "x", "description": "y"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_can_list_courses(self):
        resp = self.client.get("/api/courses/")
        self.assertEqual(resp.status_code, 200)

    # ── Guest access (no auth) ────────────────────────────────────────────────

    def test_guest_can_view_course_detail(self):
        """Guests must be able to open a course without logging in."""
        teacher = User.objects.create_user(username="t1", password="x", role="teacher")
        course = Course.objects.create(title="Open Course", description="free", teacher=teacher)
        resp = self.client.get(f"/api/courses/{course.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["title"], "Open Course")

    def test_guest_can_view_lesson_list(self):
        """Guests can list lessons."""
        teacher = User.objects.create_user(username="t2", password="x", role="teacher")
        course = Course.objects.create(title="C2", description="d", teacher=teacher)
        Lesson.objects.create(course=course, title="L1", order=1)
        resp = self.client.get("/api/lessons/")
        self.assertEqual(resp.status_code, 200)

    def test_guest_transcript_endpoint_returns_404_without_captions(self):
        """
        Guest calls transcript endpoint → backend tries YouTube auto-fetch.
        Since test has no real YouTube ID, it returns 404 with no_transcript flag
        (not 401/403 — that's the key assertion).
        """
        teacher = User.objects.create_user(username="t3", password="x", role="teacher")
        course = Course.objects.create(title="C3", description="d", teacher=teacher)
        lesson = Lesson.objects.create(course=course, title="L1", order=1, youtube_id="")
        resp = self.client.get(f"/api/lessons/{lesson.id}/transcript/?lang=hi")
        # Must NOT be 401 or 403 — guests are allowed
        self.assertNotEqual(resp.status_code, 401)
        self.assertNotEqual(resp.status_code, 403)
        # Should be 404 with structured error (no transcript)
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(resp.data.get("no_transcript"))

    def test_guest_transcript_english_returns_saved_text(self):
        """
        If an English transcript already exists in DB, guest gets it back
        without needing to log in.
        """
        en = Language.objects.get(code="en")
        teacher = User.objects.create_user(username="t4", password="x", role="teacher")
        course = Course.objects.create(title="C4", description="d", teacher=teacher)
        lesson = Lesson.objects.create(course=course, title="L1", order=1)
        Transcript.objects.create(lesson=lesson, language=en, text="Hello world", source="manual")
        resp = self.client.get(f"/api/lessons/{lesson.id}/transcript/?lang=en")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["text"], "Hello world")

    def test_guest_translated_audio_404_without_transcript(self):
        """translated_audio must not require auth — returns 404, not 401."""
        teacher = User.objects.create_user(username="t5", password="x", role="teacher")
        course = Course.objects.create(title="C5", description="d", teacher=teacher)
        lesson = Lesson.objects.create(course=course, title="L1", order=1)
        resp = self.client.get(f"/api/lessons/{lesson.id}/translated_audio/?lang=hi")
        self.assertNotEqual(resp.status_code, 401)
        self.assertNotEqual(resp.status_code, 403)
        self.assertEqual(resp.status_code, 404)

    def test_guest_complete_returns_ok_without_saving(self):
        """Guest POSTing to /complete/ gets ok:true but saved:false."""
        teacher = User.objects.create_user(username="t6", password="x", role="teacher")
        course = Course.objects.create(title="C6", description="d", teacher=teacher)
        lesson = Lesson.objects.create(course=course, title="L1", order=1)
        resp = self.client.post(
            f"/api/lessons/{lesson.id}/complete/",
            {"watch_seconds": 120},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["ok"])
        self.assertFalse(resp.data["saved"])
        self.assertEqual(resp.data["reason"], "guest")

    # ── Course lifecycle ──────────────────────────────────────────────────────

    def test_teacher_creates_and_student_enrolls(self):
        self._register_and_login("tea", "teacher")
        resp = self.client.post(
            "/api/courses/",
            {"title": "English Basics", "description": "Learn English."},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        course = Course.objects.get(title="English Basics")
        self._register_and_login("stu2", "student")
        enroll_resp = self.client.post(f"/api/courses/{course.id}/enroll/")
        self.assertEqual(enroll_resp.status_code, 200)
        self.assertTrue(enroll_resp.data["enrolled"])
        self.assertEqual(course.enrollments.count(), 1)

    def test_lesson_completion(self):
        self._register_and_login("tea2", "teacher")
        self.client.post(
            "/api/courses/",
            {"title": "DS Course", "description": "Data structures."},
            format="json",
        )
        course = Course.objects.get(title="DS Course")
        lesson = Lesson.objects.create(course=course, title="Lesson 1", order=1)
        self._register_and_login("stu3", "student")
        resp = self.client.post(
            f"/api/lessons/{lesson.id}/complete/",
            {"watch_seconds": 300},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["saved"])
        self.assertTrue(
            LessonProgress.objects.filter(student__username="stu3", lesson=lesson, completed=True).exists()
        )

    def test_teacher_can_save_transcript(self):
        """Teacher can POST a transcript; subsequent GET returns it."""
        en = Language.objects.get(code="en")
        self._register_and_login("teatr", "teacher")
        self.client.post("/api/courses/", {"title": "TC", "description": "d"}, format="json")
        course = Course.objects.get(title="TC")
        lesson = Lesson.objects.create(course=course, title="L1", order=1)
        # Save transcript
        resp = self.client.post(
            f"/api/lessons/{lesson.id}/transcript/",
            {"text": "This is a lecture about Python."},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        # Retrieve as guest (no credentials)
        self.client.credentials()
        get_resp = self.client.get(f"/api/lessons/{lesson.id}/transcript/?lang=en")
        self.assertEqual(get_resp.status_code, 200)
        self.assertIn("Python", get_resp.data["text"])

    # ── Language API ──────────────────────────────────────────────────────────

    def test_languages_public(self):
        resp = self.client.get("/api/languages/")
        self.assertEqual(resp.status_code, 200)
        items = resp.data.get("results", resp.data) if isinstance(resp.data, dict) else resp.data
        codes = [l["code"] for l in items]
        self.assertIn("en", codes)
        self.assertIn("hi", codes)

    # ── Dashboard ─────────────────────────────────────────────────────────────

    def test_student_dashboard(self):
        self._register_and_login("dashstu", "student")
        resp = self.client.get("/api/dashboard/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["role"], "student")
        self.assertIn("courses", resp.data)

    def test_teacher_dashboard(self):
        self._register_and_login("dashtea", "teacher")
        resp = self.client.get("/api/dashboard/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["role"], "teacher")

    def test_guest_cannot_access_dashboard(self):
        """Dashboard requires authentication."""
        resp = self.client.get("/api/dashboard/")
        self.assertEqual(resp.status_code, 401)
