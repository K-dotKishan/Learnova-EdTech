"""
python manage.py seed_careers
Seeds 8 career paths with beginner/intermediate/advanced stages and skills.
"""
from django.core.management.base import BaseCommand
from api.models import CareerPath, RoadmapStage, RoadmapSkill

PATHS = [
    ("full-stack-developer", "Full Stack Developer", "🌐", "from-blue-500 to-purple-600",
     "Full Stack Developers build both the frontend (what users see) and backend (server/database) of web applications. They are among the most in-demand roles in the tech industry.",
     "₹6–18 LPA", "Very High"),

    ("java-developer", "Java Developer", "☕", "from-orange-500 to-red-600",
     "Java Developers build enterprise-grade applications, Android apps, and backend services using the Java ecosystem including Spring Boot, Hibernate, and Maven.",
     "₹5–15 LPA", "High"),

    ("python-developer", "Python Developer", "🐍", "from-yellow-400 to-green-500",
     "Python Developers build web applications, automation scripts, data pipelines, and AI/ML models. Python's versatility makes it one of the most popular languages worldwide.",
     "₹5–16 LPA", "Very High"),

    ("aiml-engineer", "AI/ML Engineer", "🤖", "from-violet-500 to-purple-700",
     "AI/ML Engineers design and implement machine learning models, train neural networks, and deploy AI solutions. This is one of the highest-paid and fastest-growing tech careers.",
     "₹8–25 LPA", "Very High"),

    ("data-scientist", "Data Scientist", "📊", "from-teal-500 to-cyan-600",
     "Data Scientists analyze complex datasets to extract insights, build predictive models, and help organizations make data-driven decisions using statistics, Python, and ML.",
     "₹7–20 LPA", "High"),

    ("cloud-engineer", "Cloud Engineer", "☁️", "from-sky-500 to-blue-600",
     "Cloud Engineers design, build, and maintain cloud infrastructure on AWS, Azure, or GCP. They ensure scalability, reliability, and security of cloud-based systems.",
     "₹8–22 LPA", "Very High"),

    ("cybersecurity-engineer", "Cybersecurity Engineer", "🔐", "from-red-600 to-rose-700",
     "Cybersecurity Engineers protect systems and networks from threats, implement security measures, conduct vulnerability assessments, and respond to incidents.",
     "₹6–20 LPA", "High"),

    ("data-analyst", "Data Analyst", "🔍", "from-indigo-500 to-blue-600",
     "Data Analysts collect, clean, and interpret data to generate reports and dashboards that guide business decisions. They use SQL, Excel, Python, and BI tools.",
     "₹4–12 LPA", "High"),
]

STAGES = {
    "full-stack-developer": [
        ("beginner", "Web Foundations", "Learn HTML, CSS, and JavaScript basics to build static websites.", "2-3 months", [
            ("HTML5 & Semantic Markup", "Frontend", True),
            ("CSS3 & Flexbox/Grid", "Frontend", True),
            ("JavaScript Fundamentals", "Language", True),
            ("Responsive Design", "Frontend", True),
            ("Git & GitHub", "Tools", True),
            ("VS Code Setup", "Tools", False),
        ]),
        ("intermediate", "Frontend & Backend Development", "Build dynamic frontends with React and backend APIs with Node.js or Django.", "3-4 months", [
            ("React.js", "Framework", True),
            ("REST APIs", "Backend", True),
            ("Node.js / Django", "Backend", True),
            ("SQL Databases", "Database", True),
            ("Authentication (JWT)", "Security", True),
            ("React Router", "Frontend", False),
            ("Tailwind CSS", "Frontend", False),
        ]),
        ("advanced", "Full Stack Projects & Deployment", "Build full-stack projects and deploy to cloud platforms.", "2-3 months", [
            ("PostgreSQL / MongoDB", "Database", True),
            ("Docker & Containers", "DevOps", True),
            ("AWS / Heroku Deployment", "Cloud", True),
            ("Testing (Jest/pytest)", "Testing", True),
            ("WebSockets", "Backend", False),
            ("CI/CD Pipelines", "DevOps", False),
        ]),
    ],
    "java-developer": [
        ("beginner", "Java Fundamentals", "Learn Java syntax, OOP, and core libraries.", "2-3 months", [
            ("Java Syntax & Variables", "Language", True),
            ("OOP Concepts", "Language", True),
            ("Java Collections", "Language", True),
            ("Exception Handling", "Language", True),
            ("Maven / Gradle", "Tools", False),
        ]),
        ("intermediate", "Spring Boot & Databases", "Build RESTful APIs using Spring Boot with database integration.", "3-4 months", [
            ("Spring Boot", "Framework", True),
            ("Spring MVC", "Framework", True),
            ("Hibernate / JPA", "Database", True),
            ("MySQL / PostgreSQL", "Database", True),
            ("REST API Design", "Backend", True),
            ("Unit Testing (JUnit)", "Testing", False),
        ]),
        ("advanced", "Microservices & Cloud", "Build scalable microservices and deploy on cloud.", "2-3 months", [
            ("Microservices Architecture", "Architecture", True),
            ("Spring Cloud", "Framework", True),
            ("Docker & Kubernetes", "DevOps", True),
            ("Message Queues (Kafka)", "Backend", True),
            ("JWT Security", "Security", False),
        ]),
    ],
    "python-developer": [
        ("beginner", "Python Basics", "Master Python syntax, data types, and standard library.", "1-2 months", [
            ("Python Syntax & Variables", "Language", True),
            ("Data Types & Structures", "Language", True),
            ("Functions & Modules", "Language", True),
            ("File Handling", "Language", True),
            ("pip & Virtual Environments", "Tools", False),
        ]),
        ("intermediate", "Web Development with Django", "Build web applications and REST APIs with Django.", "2-3 months", [
            ("Django Framework", "Framework", True),
            ("Django REST Framework", "Framework", True),
            ("PostgreSQL", "Database", True),
            ("Authentication & Sessions", "Security", True),
            ("Celery (Task Queue)", "Backend", False),
        ]),
        ("advanced", "Advanced Python & Deployment", "Async Python, testing, and production deployment.", "2-3 months", [
            ("Async Python (asyncio)", "Language", True),
            ("pytest & Testing", "Testing", True),
            ("Docker", "DevOps", True),
            ("AWS / GCP Deployment", "Cloud", True),
            ("Performance Optimization", "Backend", False),
        ]),
    ],
    "aiml-engineer": [
        ("beginner", "Math & Python for ML", "Build the mathematical and programming foundation for AI/ML.", "2-3 months", [
            ("Python for Data Science", "Language", True),
            ("NumPy & Pandas", "Library", True),
            ("Linear Algebra Basics", "Math", True),
            ("Statistics & Probability", "Math", True),
            ("Matplotlib / Seaborn", "Visualization", False),
        ]),
        ("intermediate", "Machine Learning", "Learn supervised, unsupervised learning and model evaluation.", "3-4 months", [
            ("scikit-learn", "Library", True),
            ("Supervised Learning Algorithms", "ML", True),
            ("Unsupervised Learning", "ML", True),
            ("Feature Engineering", "ML", True),
            ("Model Evaluation Metrics", "ML", True),
            ("Cross-Validation", "ML", False),
        ]),
        ("advanced", "Deep Learning & MLOps", "Build neural networks and deploy ML models in production.", "3-4 months", [
            ("TensorFlow / PyTorch", "Framework", True),
            ("Neural Networks & CNNs", "DL", True),
            ("NLP Fundamentals", "DL", True),
            ("MLOps & Model Deployment", "MLOps", True),
            ("Transformers & BERT", "DL", False),
            ("Kubeflow / MLflow", "MLOps", False),
        ]),
    ],
    "data-scientist": [
        ("beginner", "Data Foundations", "Learn data manipulation and visualization tools.", "1-2 months", [
            ("Python Basics", "Language", True),
            ("Pandas & NumPy", "Library", True),
            ("Data Cleaning", "Data", True),
            ("Data Visualization", "Visualization", True),
            ("SQL for Data", "Database", True),
        ]),
        ("intermediate", "Statistical Analysis & ML", "Apply statistics and machine learning to real data problems.", "3-4 months", [
            ("Descriptive Statistics", "Statistics", True),
            ("Hypothesis Testing", "Statistics", True),
            ("Regression Analysis", "ML", True),
            ("Classification Algorithms", "ML", True),
            ("Jupyter Notebooks", "Tools", False),
        ]),
        ("advanced", "Advanced Analytics & Production", "Build end-to-end data pipelines and deploy models.", "2-3 months", [
            ("Big Data (Spark)", "Tools", True),
            ("A/B Testing", "Statistics", True),
            ("Tableau / Power BI", "Visualization", True),
            ("ML Model Deployment", "MLOps", True),
            ("Airflow (Data Pipelines)", "Tools", False),
        ]),
    ],
    "cloud-engineer": [
        ("beginner", "Cloud & Linux Basics", "Learn Linux, networking, and cloud fundamentals.", "2-3 months", [
            ("Linux Command Line", "OS", True),
            ("Networking Basics", "Networking", True),
            ("Cloud Concepts (AWS/GCP)", "Cloud", True),
            ("Git & Version Control", "Tools", True),
            ("Bash Scripting", "Scripting", False),
        ]),
        ("intermediate", "Cloud Services & IaC", "Deploy and manage cloud infrastructure.", "3-4 months", [
            ("AWS Core Services (EC2, S3, RDS)", "Cloud", True),
            ("Terraform / CloudFormation", "IaC", True),
            ("Docker & Containers", "DevOps", True),
            ("Kubernetes Basics", "DevOps", True),
            ("CI/CD Pipelines", "DevOps", False),
        ]),
        ("advanced", "Cloud Architecture & Security", "Design scalable, secure cloud architectures.", "2-3 months", [
            ("Microservices on Cloud", "Architecture", True),
            ("Cloud Security Best Practices", "Security", True),
            ("Cost Optimization", "Cloud", True),
            ("Multi-Cloud Strategy", "Architecture", True),
            ("AWS Solutions Architect", "Certification", False),
        ]),
    ],
    "cybersecurity-engineer": [
        ("beginner", "Security Foundations", "Learn networking, OS, and fundamental security concepts.", "2-3 months", [
            ("Networking Fundamentals", "Networking", True),
            ("Linux & Windows Security", "OS", True),
            ("CIA Triad & Security Principles", "Concepts", True),
            ("Cryptography Basics", "Security", True),
            ("Python for Security", "Language", False),
        ]),
        ("intermediate", "Ethical Hacking & Defense", "Learn offensive and defensive security techniques.", "3-4 months", [
            ("Penetration Testing", "Offensive", True),
            ("Vulnerability Assessment", "Offensive", True),
            ("Firewalls & IDS/IPS", "Defensive", True),
            ("SIEM Tools (Splunk)", "Tools", True),
            ("OWASP Top 10", "Web Security", True),
            ("Wireshark & Nmap", "Tools", False),
        ]),
        ("advanced", "Incident Response & Compliance", "Handle security incidents and implement compliance frameworks.", "2-3 months", [
            ("Incident Response", "Defensive", True),
            ("Digital Forensics", "Forensics", True),
            ("Cloud Security", "Cloud", True),
            ("ISO 27001 / NIST", "Compliance", True),
            ("CEH / OSCP Certification", "Certification", False),
        ]),
    ],
    "data-analyst": [
        ("beginner", "Data Analysis Foundations", "Learn Excel, SQL, and basic Python for data analysis.", "1-2 months", [
            ("Microsoft Excel / Google Sheets", "Tools", True),
            ("SQL Basics", "Database", True),
            ("Python for Data", "Language", True),
            ("Data Types & Cleaning", "Data", True),
            ("Basic Statistics", "Statistics", False),
        ]),
        ("intermediate", "Advanced Analysis & Visualization", "Create insightful visualizations and dashboards.", "2-3 months", [
            ("Advanced SQL", "Database", True),
            ("Pandas & NumPy", "Library", True),
            ("Tableau", "Visualization", True),
            ("Power BI", "Visualization", True),
            ("Pivot Tables & Advanced Excel", "Tools", False),
        ]),
        ("advanced", "Business Intelligence & Reporting", "Build BI dashboards and automate reporting.", "2-3 months", [
            ("Business Intelligence Concepts", "BI", True),
            ("Google Data Studio / Looker", "Visualization", True),
            ("KPI Dashboard Design", "BI", True),
            ("Storytelling with Data", "Communication", True),
            ("Python Automation Scripts", "Language", False),
        ]),
    ],
}


class Command(BaseCommand):
    help = "Seed Career Compass paths, stages and skills."

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding career paths…")
        for order, row in enumerate(PATHS):
            slug, title, icon, color, overview, salary, demand = row
            path, _ = CareerPath.objects.get_or_create(
                slug=slug,
                defaults={"title": title, "icon": icon, "color": color,
                          "overview": overview, "avg_salary": salary,
                          "demand": demand, "order": order}
            )

            stages_data = STAGES.get(slug, [])
            for s_order, (stage_key, stage_title, stage_desc, duration, skills) in enumerate(stages_data):
                stage, _ = RoadmapStage.objects.get_or_create(
                    path=path, stage=stage_key,
                    defaults={"title": stage_title, "description": stage_desc,
                              "duration": duration, "order": s_order}
                )
                for sk_order, (skill_name, category, is_core) in enumerate(skills):
                    RoadmapSkill.objects.get_or_create(
                        stage=stage, name=skill_name,
                        defaults={"category": category, "is_core": is_core, "order": sk_order}
                    )

        self.stdout.write(self.style.SUCCESS(
            "\n✓ Careers seeded! {} paths, {} stages, {} skills".format(
                CareerPath.objects.count(),
                RoadmapStage.objects.count(),
                RoadmapSkill.objects.count(),
            )
        ))
