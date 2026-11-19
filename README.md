# 🌿 Learnova

> **Learn. Explore. Grow.**

Learnova is a full-stack multilingual learning platform. Students watch YouTube-based courses with real-time translated subtitles and AI-dubbed audio, read interactive comic life stories of historical legends in English and Hindi, test their knowledge in a timed quiz arena, and follow structured career roadmaps — all in one place.

---

## 📸 Pages at a Glance

| Page | Description |
|---|---|
| **Landing** | Hero, features, featured courses, CTA |
| **Courses** | Browse, search, filter by level and category |
| **Course Detail** | Lessons list, progress bar, teacher controls |
| **Learn (Video Player)** | YouTube player + translated subtitles + dubbed audio |
| **Legends** | Comic life stories of historical personalities |
| **Legend Story** | Panel-by-panel comic reader with EN/HI toggle and quiz |
| **Knowledge Arena** | Timed quiz with XP, leaderboard, topic selection |
| **Career Compass** | Career roadmaps with skill progress tracking |
| **Dashboard** | Student progress and teacher course stats |
| **Auth** | Login and register |

---

## 🗂️ Project Structure

```
LinguaLearnAI/
├── backend/                  # Django REST API
│   ├── api/
│   │   ├── models.py         # All database models
│   │   ├── views.py          # All API endpoints
│   │   ├── serializers.py    # JSON conversion for courses/lessons
│   │   ├── services.py       # YouTube captions, translation, TTS
│   │   ├── consumers.py      # WebSocket for live classes
│   │   ├── urls.py           # URL routing
│   │   ├── admin.py          # Django admin registration
│   │   └── management/
│   │       └── commands/
│   │           ├── seed.py           # Seed courses and lessons
│   │           ├── seed_arena.py     # Seed quiz topics and questions
│   │           ├── seed_legends.py   # Seed legends and story panels
│   │           └── seed_careers.py   # Seed career paths
│   ├── lingualearn/
│   │   ├── settings.py       # Django configuration
│   │   ├── urls.py           # Root URL config
│   │   └── asgi.py           # ASGI entry point for WebSocket
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Secret keys (not committed)
│   └── .env.example          # Template for .env
│
└── frontend/                 # React + Vite
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── Auth.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Courses.jsx
    │   │   ├── Course.jsx
    │   │   ├── Learn.jsx         # Video player + subtitles
    │   │   ├── Legends.jsx
    │   │   ├── LegendStory.jsx   # Comic reader
    │   │   ├── KnowledgeArena.jsx
    │   │   ├── CareerCompass.jsx
    │   │   └── Live.jsx          # WebSocket live class
    │   ├── hooks/
    │   │   └── useLang.js        # Custom EN/HI language hook
    │   ├── locales/
    │   │   ├── en.json           # English UI strings + 3 full stories
    │   │   └── hi.json           # Hindi UI strings + 3 full stories
    │   ├── App.jsx               # Router + navbar
    │   ├── api.js                # Fetch wrapper for all API calls
    │   └── main.jsx              # React entry point
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Backend language |
| **Django** | ≥ 5.0 | Web framework |
| **Django REST Framework** | ≥ 3.15 | REST API (ViewSets, serializers, permissions) |
| **djangorestframework-simplejwt** | ≥ 5.3 | JWT authentication (login/register tokens) |
| **django-cors-headers** | ≥ 4.3 | Allow frontend to call backend API |
| **Django Channels** | ≥ 4.1 | WebSocket support for live classes |
| **Daphne** | ≥ 4.1 | ASGI server that runs Channels |
| **python-dotenv** | ≥ 1.0 | Load `.env` variables into settings |
| **Pillow** | ≥ 10 | Image handling for user avatars |
| **youtube-transcript-api** | ≥ 1.2 | Fetch auto-generated English captions from YouTube |
| **translatepy** | ≥ 2.3 | Free translation library (no API key needed) |
| **google-cloud-speech** | ≥ 2.26 | Speech-to-Text for live classes (optional) |
| **google-cloud-translate** | ≥ 3.15 | Google Cloud Translation API (optional, faster) |
| **google-cloud-texttospeech** | ≥ 2.16 | AI-dubbed audio generation (optional) |
| **SQLite** | built-in | Default database |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3.1 | UI library |
| **React Router DOM** | 6.26.0 | Client-side routing |
| **Vite** | 5.4.0 | Build tool and dev server |
| **Tailwind CSS** | 3.4.10 | Utility-first CSS styling |
| **PostCSS + Autoprefixer** | — | CSS processing for Tailwind |
| **YouTube IFrame API** | — | Embed and control YouTube videos |
| **Web Speech API** | browser built-in | Read-aloud on Legends page |
| **WebSocket API** | browser built-in | Live class connection |

### No i18n Library
Language switching (EN/HI) is built with a **custom hook** (`useLang.js`) — no `react-i18next` or similar library is used.

---

## ⚙️ How Key Features Work

### Translated Subtitles
1. User selects a language in the video player
2. Frontend calls `GET /api/lessons/{id}/transcript/?lang=pa`
3. Backend fetches English captions from YouTube using `youtube-transcript-api`
4. 2000+ tiny caption fragments are merged into ~8-second blocks (`_merge_caption_segments`)
5. Blocks are translated using `translatepy` (free) or Google Cloud Translation (if configured)
6. Translated segments with original timestamps are saved to `TranslatedSubtitle` table (cache)
7. Frontend polls `ytPlayer.getCurrentTime()` every 500ms and shows the matching subtitle

### EN/HI Language Toggle on Legends
- `useLang.js` hook reads `en.json` or `hi.json` based on user's choice
- Choice is saved in `localStorage` and persists on refresh
- For Gandhi, Kalam, Einstein: full Hindi content is in `hi.json`
- For other legends: Hindi content comes from `_hi` fields in the database
- `LegendStory.jsx` merges both sources — JSON takes priority, database is fallback

### Live Classes (WebSocket)
- Teacher starts mic → browser captures audio via `getUserMedia`
- Audio is sent over WebSocket to `consumers.py`
- Django Channels consumer uses Google Cloud Speech-to-Text to transcribe
- Transcript is broadcast to all connected students in real time

### JWT Authentication
- Register: `POST /api/auth/register/` creates user
- Login: `POST /api/auth/login/` returns `access` token
- Token stored in `localStorage`, sent as `Authorization: Bearer <token>` on every request
- `GET /api/auth/me/` returns logged-in user info

---

## 🗄️ Database Models

| Model | Table purpose |
|---|---|
| `User` | Extended Django user with `role` (student/teacher) |
| `UserProfile` | Preferred language, bio, watch minutes, streak |
| `Language` | Supported languages — code, name, TTS code, flag |
| `Category` | Course categories with icon |
| `Course` | Course — title, level, teacher, thumbnail |
| `Lesson` | Lesson — YouTube ID, duration, order |
| `Enrollment` | Student ↔ Course relationship |
| `LessonProgress` | Watch seconds and completion per student per lesson |
| `Transcript` | English caption text for a lesson |
| `TranslatedSubtitle` | Cached translated subtitle segments with timestamps |
| `TranslatedAudio` | Cached TTS MP3 audio per lesson per language |
| `LiveClass` | Scheduled live class linked to a course |
| `LegendCategory` | Legend categories (Scientists, Freedom Fighters, etc.) |
| `Legend` | Historical personality — name, photo, tagline, EN+HI |
| `StoryPanel` | One comic panel — narration, speech bubble, EN+HI |
| `QuizQuestion` | Quiz question for a legend — EN+HI |
| `LegendBookmark` | User bookmarked a legend |
| `QuizTopic` | Knowledge Arena topic |
| `ArenaQuestion` | Arena quiz question with difficulty |
| `QuizAttempt` | Completed quiz session with score and XP |
| `UserXP` | Total XP and level per user |
| `CareerPath` | Career roadmap (Full Stack, Data Science, etc.) |
| `RoadmapStage` | Beginner / Intermediate / Advanced stage |
| `RoadmapSkill` | Individual skill in a stage |
| `SkillProgress` | Which skills a user has completed |

---

## 🚀 Setup and Run

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env — set DJANGO_SECRET_KEY

# Run migrations
python manage.py migrate

# Seed sample data
python manage.py seed
python manage.py seed_legends
python manage.py seed_arena
python manage.py seed_careers

# Start server
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🔑 Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Required
DJANGO_SECRET_KEY=your-long-random-secret-key
DJANGO_DEBUG=True

# Optional — enables Google Cloud features
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
```

**Without Google Cloud:** Subtitles and translation still work using `translatepy` (free). Dubbed audio (TTS) and live class STT require Google Cloud credentials.

---

## 🌐 API Endpoints

### Auth
```
POST   /api/auth/register/        Register new user
POST   /api/auth/login/           Login, returns JWT token
GET    /api/auth/me/              Get logged-in user info
```

### Courses & Lessons
```
GET    /api/courses/              List courses (filterable by q, category, level)
GET    /api/courses/{id}/         Course detail with lessons
POST   /api/courses/{id}/enroll/  Enroll in a course
GET    /api/courses/{id}/progress/ Lesson completion progress
GET    /api/lessons/{id}/transcript/?lang=hi   Get/translate subtitles
GET    /api/lessons/{id}/translated_audio/?lang=hi  Get dubbed audio
POST   /api/lessons/{id}/complete/  Mark lesson as complete
```

### Legends
```
GET    /api/legends/              List all legends
GET    /api/legends/{slug}/       Legend detail with panels and quiz
GET    /api/legends/categories/   All legend categories
POST   /api/legends/{slug}/bookmark/   Bookmark a legend
DELETE /api/legends/{slug}/bookmark/   Remove bookmark
```

### Knowledge Arena
```
GET    /api/arena/topics/                     List quiz topics
GET    /api/arena/topics/{slug}/questions/    Get 5 questions for a topic
POST   /api/arena/submit/                     Submit answers, get XP
GET    /api/arena/leaderboard/                Top 10 by XP
GET    /api/arena/stats/                      My stats
```

### Career Compass
```
GET    /api/careers/                     List career paths
GET    /api/careers/{slug}/              Career detail with roadmap
GET    /api/careers/{slug}/progress/     My skill completion %
POST   /api/careers/skills/{id}/toggle/  Mark skill complete/incomplete
```

---

## 📦 Supported Languages for Subtitles

Any language that exists in the `Language` database table is supported. Default seeded languages include:

| Language | Code |
|---|---|
| English | `en` |
| Hindi | `hi` |
| Punjabi | `pa` |
| Tamil | `ta` |
| Telugu | `te` |
| Gujarati | `gu` |
| Bengali | `bn` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Portuguese | `pt` |

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| **Student** | Watch courses, track progress, do quizzes, read legends, bookmark, follow career paths |
| **Teacher** | All student capabilities + create courses, add lessons, schedule live classes, view student stats |
| **Guest** | Browse courses, watch lessons, do quizzes — progress saved in localStorage only |

---

## 📄 License

MIT
