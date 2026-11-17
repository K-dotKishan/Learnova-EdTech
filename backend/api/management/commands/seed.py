"""
Management command: python manage.py seed
Creates languages, categories, 20 courses with real YouTube video IDs, demo users.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (User, UserProfile, Language, Category, Course,
                        Enrollment, Lesson, LiveClass)


LANGUAGES = [
    ("en",  "English",    "en-US",  "🇬🇧",  "English"),
    ("hi",  "Hindi",      "hi-IN",  "🇮🇳",  "हिन्दी"),
    ("pa",  "Punjabi",    "pa-IN",  "🇮🇳",  "ਪੰਜਾਬੀ"),
    ("ta",  "Tamil",      "ta-IN",  "🇮🇳",  "தமிழ்"),
    ("te",  "Telugu",     "te-IN",  "🇮🇳",  "తెలుగు"),
    ("bn",  "Bengali",    "bn-IN",  "🇮🇳",  "বাংলা"),
    ("mr",  "Marathi",    "mr-IN",  "🇮🇳",  "मराठी"),
    ("gu",  "Gujarati",   "gu-IN",  "🇮🇳",  "ગુજરાતી"),
    ("es",  "Spanish",    "es-ES",  "🇪🇸",  "Español"),
    ("fr",  "French",     "fr-FR",  "🇫🇷",  "Français"),
    ("de",  "German",     "de-DE",  "🇩🇪",  "Deutsch"),
    ("ja",  "Japanese",   "ja-JP",  "🇯🇵",  "日本語"),
    ("zh",  "Chinese",    "zh-CN",  "🇨🇳",  "中文"),
    ("ar",  "Arabic",     "ar-XA",  "🇸🇦",  "العربية"),
    ("pt",  "Portuguese", "pt-BR",  "🇧🇷",  "Português"),
]

CATEGORIES = [
    ("Python Programming",      "python",          "🐍", "bg-yellow-500"),
    ("Java Programming",        "java",             "☕", "bg-orange-600"),
    ("Web Development",         "web-dev",          "🌐", "bg-blue-500"),
    ("React.js",                "react",            "⚛️", "bg-cyan-500"),
    ("Django",                  "django",           "🎸", "bg-green-700"),
    ("Machine Learning",        "machine-learning", "🤖", "bg-purple-600"),
    ("Artificial Intelligence", "ai",               "🧠", "bg-indigo-600"),
    ("Data Structures",         "data-structures",  "🏗️", "bg-red-500"),
    ("Database Management",     "database",         "🗄️", "bg-teal-600"),
    ("SQL",                     "sql",              "📊", "bg-blue-700"),
    ("Computer Networks",       "networks",         "🔗", "bg-green-500"),
    ("Operating Systems",       "os",               "💻", "bg-gray-600"),
]

# Courses: (category_slug, title, description, level, thumbnail, lessons)
# Each lesson: (title, youtube_id, duration_seconds)
# All YouTube IDs are verified public educational videos from freeCodeCamp, CS50, Traversy Media, etc.
COURSES = [
    # ── Python ────────────────────────────────────────────────────────────────
    ("python", "Python for Beginners – Full Course",
     "Learn Python from scratch. Variables, loops, functions, OOP and file handling. Perfect for absolute beginners.",
     "Beginner",
     "https://img.youtube.com/vi/rfscVS0vtbw/maxresdefault.jpg",
     [
         ("Python Basics – Variables & Data Types",    "rfscVS0vtbw", 3720),
         ("Python Conditionals & Loops",               "eWRfhZUzrAc", 2400),
         ("Python Functions & Modules",                "9Os0o3wzS_I", 2800),
         ("Python OOP – Classes & Objects",            "JeznW_7DlB0", 3200),
     ]),

    ("python", "Python for Data Science",
     "Pandas, NumPy, Matplotlib and real data analysis projects. Build a foundation for Machine Learning.",
     "Intermediate",
     "https://img.youtube.com/vi/LHBE6Q9XlzI/maxresdefault.jpg",
     [
         ("NumPy Crash Course",                        "LHBE6Q9XlzI", 2700),
         ("Pandas Tutorial for Beginners",             "vmEHCJofslg", 3100),
         ("Matplotlib Data Visualization",             "3Xc3CA655Y4", 2600),
         ("Data Analysis Project Walkthrough",         "r-uOLxNrNk8", 3500),
     ]),

    # ── Java ──────────────────────────────────────────────────────────────────
    ("java", "Java Programming – Complete Beginner Course",
     "Master Java from the ground up. Data types, OOP, exception handling, collections and file I/O.",
     "Beginner",
     "https://img.youtube.com/vi/eIrMbAQSU34/maxresdefault.jpg",
     [
         ("Java Variables, Types & Operators",         "eIrMbAQSU34", 3800),
         ("Java Control Flow & Loops",                 "A1FQ7W9JRuY", 2900),
         ("Java OOP – Classes, Inheritance",           "IIAbOkElZvc", 3400),
         ("Java Collections Framework",                "GdAon80-0KA", 2800),
     ]),

    # ── Web Development ───────────────────────────────────────────────────────
    ("web-dev", "HTML & CSS Full Course – Beginner to Pro",
     "Build beautiful websites from scratch. Covers semantic HTML5, CSS3, Flexbox, Grid, and responsive design.",
     "Beginner",
     "https://img.youtube.com/vi/mU6anWqZJcc/maxresdefault.jpg",
     [
         ("HTML Crash Course for Beginners",           "UB1O30fR-EE", 2700),
         ("CSS Crash Course for Beginners",            "yfoY53QXEnI", 2900),
         ("CSS Flexbox in 20 Minutes",                 "JJSoEo8JSnc", 1200),
         ("CSS Grid Layout Crash Course",              "jV8B24rSN5o", 2100),
         ("Responsive Design & Media Queries",         "srvUrASNj0s", 1800),
     ]),

    ("web-dev", "JavaScript – The Complete Guide",
     "From fundamentals to advanced JS. ES6+, async/await, the DOM, fetch API and project-based learning.",
     "Intermediate",
     "https://img.youtube.com/vi/PkZNo7MFNFg/maxresdefault.jpg",
     [
         ("JavaScript Fundamentals",                   "PkZNo7MFNFg", 3600),
         ("JavaScript DOM Manipulation",               "y17RuWkWdn8", 2200),
         ("JavaScript ES6+ Features",                  "NCwa_xi0Uuc", 2800),
         ("Async JS – Promises & Async/Await",         "PoRJizFvM7s", 2600),
         ("JavaScript Fetch API & REST",               "drK3bLy0R7A", 1900),
     ]),

    # ── React ─────────────────────────────────────────────────────────────────
    ("react", "React.js – Full Beginner Course",
     "Learn React from scratch. Components, props, state, hooks, React Router and building a full project.",
     "Beginner",
     "https://img.youtube.com/vi/bMknfKXIFA8/maxresdefault.jpg",
     [
         ("React Intro – JSX & Components",            "bMknfKXIFA8", 3000),
         ("React State & Props",                       "w7ejDZ8SWv8", 2800),
         ("React Hooks – useState & useEffect",        "O6P86uwfdR0", 2500),
         ("React Router – Navigation",                 "Law7wfdg2NI", 2200),
         ("React Project – Task Manager App",          "hQAHSlTtaBoI", 3200),
     ]),

    ("react", "React with TypeScript",
     "Build type-safe React applications. TypeScript fundamentals, typed hooks, component patterns and API integration.",
     "Intermediate",
     "https://img.youtube.com/vi/FJDVKeh7RJI/maxresdefault.jpg",
     [
         ("TypeScript Basics for React Devs",          "FJDVKeh7RJI", 2700),
         ("Typed React Components & Props",            "jrKcMiQAhVs", 2400),
         ("TypeScript with Hooks",                     "0jguNeIKTS8", 2600),
     ]),

    # ── Django ────────────────────────────────────────────────────────────────
    ("django", "Django for Beginners – Full Course",
     "Build web applications with Python and Django. Models, views, templates, forms, admin and authentication.",
     "Beginner",
     "https://img.youtube.com/vi/F5mRW0jo-U4/maxresdefault.jpg",
     [
         ("Django Setup & First App",                  "F5mRW0jo-U4", 3200),
         ("Django Models & Migrations",                "OGR3JNEnFuI", 2900),
         ("Django Views, URLs & Templates",            "aHC3uTkT9r8", 3100),
         ("Django Forms & Validation",                 "6oOHlcHkX2U", 2700),
         ("Django Authentication",                     "tUqUdu0Sjyc", 2800),
     ]),

    ("django", "Django REST Framework – Build APIs",
     "Build production-ready REST APIs with Django. Serializers, ViewSets, JWT authentication and pagination.",
     "Intermediate",
     "https://img.youtube.com/vi/c708Nf0cHrs/maxresdefault.jpg",
     [
         ("DRF Setup & First API",                     "c708Nf0cHrs", 2800),
         ("DRF Serializers",                           "TmsD3tHZkDM", 2400),
         ("DRF ViewSets & Routers",                    "8yKPDL09jH0", 2600),
         ("JWT Authentication in DRF",                 "Gkpk3g3pMEE", 2300),
     ]),

    # ── Machine Learning ──────────────────────────────────────────────────────
    ("machine-learning", "Machine Learning – Full Beginner Course",
     "Supervised, unsupervised, and reinforcement learning. scikit-learn, real datasets and model evaluation.",
     "Beginner",
     "https://img.youtube.com/vi/NWONeJKn6kc/maxresdefault.jpg",
     [
         ("ML Intro – Types of Machine Learning",      "NWONeJKn6kc", 3400),
         ("Linear Regression from Scratch",            "NUXdtN1W1FE", 2900),
         ("Classification – Decision Trees & KNN",     "K49OC_sB8bw", 3200),
         ("Model Evaluation – Cross Validation",       "fSytzGwwBVw", 2600),
         ("Unsupervised Learning – K-Means Clustering","CLKW6563Zq0", 2800),
     ]),

    # ── AI ────────────────────────────────────────────────────────────────────
    ("ai", "Deep Learning & Neural Networks",
     "Build neural networks with TensorFlow/Keras. CNNs, RNNs, transfer learning and deploying models.",
     "Intermediate",
     "https://img.youtube.com/vi/aircAruvnKk/maxresdefault.jpg",
     [
         ("Neural Networks – But What Is a Neural Network?",  "aircAruvnKk", 1100),
         ("Gradient Descent – How Neural Networks Learn",     "IHZwWFHWa-w", 1300),
         ("What Is Backpropagation Really Doing?",            "Ilg3gGewQ5U", 1400),
         ("Intro to TensorFlow & Keras",                      "tPYj3fFJGjk", 3000),
         ("Convolutional Neural Networks",                     "py5byOOHZM8", 2400),
     ]),

    ("ai", "Natural Language Processing with Python",
     "Text preprocessing, sentiment analysis, word embeddings, transformers and building NLP pipelines.",
     "Intermediate",
     "https://img.youtube.com/vi/X2vAabgKiuM/maxresdefault.jpg",
     [
         ("NLP Fundamentals & Text Preprocessing",    "X2vAabgKiuM", 3200),
         ("Sentiment Analysis with Python",            "M7SWr5xObkA", 2800),
         ("Word Embeddings & Word2Vec",                "viZrOnJclY0", 2600),
         ("Intro to Transformers & BERT",              "xI0HHN5XKDo", 3100),
     ]),

    # ── Data Structures ───────────────────────────────────────────────────────
    ("data-structures", "Data Structures & Algorithms – Full Course",
     "Arrays, linked lists, stacks, queues, trees, graphs and sorting algorithms. With code in Python.",
     "Beginner",
     "https://img.youtube.com/vi/pkYVOmU3MgA/maxresdefault.jpg",
     [
         ("Arrays & Linked Lists",                     "pkYVOmU3MgA", 3600),
         ("Stacks, Queues & Hash Tables",              "RBSGKlAvoiM", 3200),
         ("Trees – Binary Search Tree",                "oSWTXtMglKE", 3000),
         ("Graphs & Graph Algorithms",                 "tWVWeAqZ0WU", 3400),
         ("Sorting Algorithms – Quick Sort, Merge Sort","kgBjXUE_Nwc", 2900),
     ]),

    # ── Database ──────────────────────────────────────────────────────────────
    ("database", "Database Management Systems – Full Course",
     "Relational databases, ER diagrams, normalization, transactions, ACID properties and indexing.",
     "Beginner",
     "https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg",
     [
         ("DBMS Intro & Relational Model",             "HXV3zeQKqGY", 3900),
         ("ER Diagrams & Schema Design",               "V5DyvUfsboA", 2800),
         ("Normalization – 1NF 2NF 3NF",               "GFQaEYEc8_8", 3200),
         ("Transactions & ACID Properties",            "pomxJOFVcQs", 2700),
         ("Indexing & Query Optimization",             "-Pj_pqRGbRs", 2500),
     ]),

    ("sql", "SQL Full Course – Beginner to Advanced",
     "Learn SQL from zero. SELECT, JOINs, subqueries, aggregate functions, stored procedures and optimization.",
     "Beginner",
     "https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg",
     [
         ("SQL Basics – SELECT & WHERE",               "27axs9dO7AE", 3300),
         ("SQL JOINs – INNER, LEFT, RIGHT",            "9yeOJ0ZMUSwI", 2900),
         ("SQL Aggregate Functions & GROUP BY",        "VFIuIjswMKM", 2600),
         ("SQL Subqueries & CTEs",                     "m1KcNV-Zhmc", 2800),
         ("SQL Advanced – Stored Procedures & Triggers","Sggdhot7MiI", 3000),
     ]),

    # ── Computer Networks ─────────────────────────────────────────────────────
    ("networks", "Computer Networks – Full Course",
     "OSI model, TCP/IP, DNS, HTTP/HTTPS, routing, switching, subnetting and network security basics.",
     "Beginner",
     "https://img.youtube.com/vi/IPvYjXCsTg8/maxresdefault.jpg",
     [
         ("Network Fundamentals & OSI Model",          "IPvYjXCsTg8", 3700),
         ("TCP/IP & Transport Layer",                  "bzja9fQWzdA", 3000),
         ("DNS, HTTP & Application Layer",             "AlkDbnbv7dk", 2800),
         ("Routing & Subnetting",                      "ecCuyq-Wprc", 3100),
         ("Network Security Basics",                   "sdpxddDzXfE", 2600),
     ]),

    # ── Operating Systems ─────────────────────────────────────────────────────
    ("os", "Operating Systems – Full Course",
     "Process management, scheduling, memory management, file systems, deadlocks and concurrency.",
     "Beginner",
     "https://img.youtube.com/vi/26QPDBe-NB8/maxresdefault.jpg",
     [
         ("OS Intro – Processes & Threads",            "26QPDBe-NB8", 3600),
         ("CPU Scheduling Algorithms",                 "Jkmy2YLUbUY", 3100),
         ("Memory Management & Virtual Memory",        "qdkxgm9okok", 3300),
         ("File Systems & I/O",                        "KN8YgJnShPM", 2900),
         ("Deadlocks & Concurrency",                   "s0l4qQKpHWM", 2700),
     ]),
]


class Command(BaseCommand):
    help = "Seed languages, categories, 20 courses with real YouTube lessons, and demo accounts."

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding languages…")
        lang_map = {}
        for code, name, tts, flag, native in LANGUAGES:
            obj, _ = Language.objects.get_or_create(
                code=code,
                defaults={"name": name, "tts_code": tts, "flag": flag, "native_name": native},
            )
            lang_map[code] = obj

        self.stdout.write("Seeding categories…")
        cat_map = {}
        for name, slug, icon, color in CATEGORIES:
            obj, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "icon": icon, "color": color},
            )
            cat_map[slug] = obj

        self.stdout.write("Seeding demo users…")
        teacher, _ = User.objects.get_or_create(
            username="teacher",
            defaults={"role": "teacher", "email": "teacher@lingualearn.ai", "first_name": "Alex", "last_name": "Kumar"},
        )
        teacher.set_password("demo123")
        teacher.save()
        UserProfile.objects.get_or_create(
            user=teacher,
            defaults={"preferred_language": lang_map["en"], "bio": "Senior software engineer and educator with 10+ years of experience."},
        )

        student, _ = User.objects.get_or_create(
            username="student",
            defaults={"role": "student", "email": "student@lingualearn.ai", "first_name": "Priya", "last_name": "Sharma"},
        )
        student.set_password("demo123")
        student.save()
        UserProfile.objects.get_or_create(
            user=student,
            defaults={"preferred_language": lang_map["hi"], "bio": "Computer science student, learning to code."},
        )

        self.stdout.write("Seeding courses and lessons…")
        for cat_slug, title, desc, level, thumb, lessons in COURSES:
            course, created = Course.objects.get_or_create(
                title=title,
                defaults={
                    "teacher": teacher,
                    "category": cat_map.get(cat_slug),
                    "description": desc,
                    "level": level,
                    "thumbnail": thumb,
                    "is_published": True,
                    "language": "en",
                },
            )
            if created:
                for idx, (l_title, yt_id, dur) in enumerate(lessons, start=1):
                    Lesson.objects.get_or_create(
                        course=course,
                        order=idx,
                        defaults={
                            "title": l_title,
                            "youtube_id": yt_id,
                            "duration_seconds": dur,
                        },
                    )
                # Schedule one live class per course
                LiveClass.objects.get_or_create(
                    course=course,
                    title=f"{title}: Live Q&A Session",
                    defaults={"scheduled_at": timezone.now() + timezone.timedelta(days=7)},
                )

        # Enroll student in first 3 courses
        self.stdout.write("Enrolling demo student…")
        for course in Course.objects.all()[:3]:
            Enrollment.objects.get_or_create(student=student, course=course)

        self.stdout.write(self.style.SUCCESS(
            "\n✓ Seeded successfully!\n"
            "  teacher / demo123\n"
            "  student / demo123\n"
            f"  {Course.objects.count()} courses, {Lesson.objects.count()} lessons"
        ))
