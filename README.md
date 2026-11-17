# LinguaLearn AI
React (Vite + Tailwind) frontend, Django + DRF + Channels backend, Google Cloud STT → Translation → TTS.

## Run
```bash
# Backend (terminal 1)
cd backend && python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in GOOGLE_APPLICATION_CREDENTIALS (service-account JSON; enable Speech-to-Text, Translation, Text-to-Speech APIs)
python manage.py makemigrations api && python manage.py migrate
python manage.py seed       # demo data: teacher/demo123, student/demo123
python manage.py createsuperuser   # for /admin
python manage.py test
daphne -p 8000 lingualearn.asgi:application   # serves REST + WebSockets

# Frontend (terminal 2)
cd frontend && npm install && npm run dev      # http://localhost:5173
```
## Try live translation
Log in as `teacher` in one browser, `student` in another. Open a course → Live class. Student picks a language; teacher clicks Start microphone and speaks English.
Without credentials the app runs and shows "Google Cloud credentials missing" instead of translating.

## Django concepts (INT253) and where they are
| Concept | File |
|---|---|
| Project/app structure, settings, ASGI | `backend/lingualearn/`, `backend/api/` |
| Models, FK/OneToOne, migrations, ORM | `api/models.py`, `api/migrations/` |
| URL routing, views, GET/POST | `api/urls.py`, `api/views.py` |
| DRF serializers + validation, ViewSets | `api/serializers.py`, `api/views.py` |
| Auth, JWT, role permissions | `IsTeacherOrReadOnly`, `/api/auth/*` |
| Cookies/sessions, CSRF | `settings.py` (SessionMiddleware, CsrfViewMiddleware; session used by `/admin/`) |
| Django Admin | `api/admin.py` |
| Templates / DTL | Django admin templates; add your own under `backend/templates/` |
| Error handling | 403/404/503 responses, `GoogleNotConfigured` in `services.py` |
| Testing | `api/tests.py` |
| Channels/WebSockets | `api/consumers.py`, `api/routing.py` |

## Known gaps
WebRTC live video, automatic subtitle generation from uploaded video files, and forms/templates beyond the admin are not implemented. Live translation is audio-only via WebSockets. Migrations are generated on your machine (`makemigrations`). I could not run or test the code in my sandbox (no internet), so expect to fix small issues on first run.
