"""
python manage.py seed_arena
Seeds 11 quiz topics and 5 real MCQ questions per topic (55 total).
"""
from django.core.management.base import BaseCommand
from api.models import QuizTopic, ArenaQuestion

TOPICS = [
    ("Python",            "python",    "🐍", "from-yellow-400 to-green-500"),
    ("Java",              "java",      "☕", "from-orange-500 to-red-600"),
    ("C++",               "cpp",       "⚙️", "from-blue-600 to-indigo-700"),
    ("Data Structures",   "dsa",       "🏗️", "from-purple-500 to-pink-600"),
    ("DBMS",              "dbms",      "🗄️", "from-teal-500 to-cyan-600"),
    ("SQL",               "sql",       "📊", "from-blue-500 to-teal-600"),
    ("Operating Systems", "os",        "💻", "from-gray-600 to-slate-700"),
    ("Computer Networks", "networks",  "🔗", "from-green-500 to-emerald-600"),
    ("Django",            "django",    "🎸", "from-green-700 to-teal-800"),
    ("React",             "react",     "⚛️", "from-cyan-400 to-blue-500"),
    ("AI/ML",             "aiml",      "🤖", "from-violet-500 to-purple-700"),
]

# (topic_slug, text, opt_a, opt_b, opt_c, opt_d, correct, explanation, difficulty, is_daily)
QUESTIONS = [
    # ── Python ──────────────────────────────────────────────────────────────
    ("python", "Which keyword is used to define a function in Python?",
     "func", "def", "function", "define", "b",
     "`def` is the keyword used to define a function in Python. Example: `def my_function():`", "easy", True),
    ("python", "What is the output of `type([])` in Python?",
     "<class 'tuple'>", "<class 'dict'>", "<class 'list'>", "<class 'array'>", "c",
     "`[]` creates an empty list, so `type([])` returns `<class 'list'>`.", "easy", False),
    ("python", "Which of these is used to handle exceptions in Python?",
     "try/catch", "try/except", "try/handle", "catch/except", "b",
     "Python uses `try/except` blocks. Unlike Java/JS which use `try/catch`.", "easy", False),
    ("python", "What does `//` operator do in Python?",
     "Division", "Modulus", "Floor division", "Exponentiation", "c",
     "`//` performs floor division — returns the integer quotient. e.g. `7 // 2 = 3`.", "medium", False),
    ("python", "Which built-in function returns the number of items in a list?",
     "count()", "size()", "len()", "length()", "c",
     "`len()` returns the number of elements. e.g. `len([1,2,3])` returns `3`.", "easy", True),

    # ── Java ────────────────────────────────────────────────────────────────
    ("java", "Which method is the entry point of a Java program?",
     "start()", "run()", "main()", "init()", "c",
     "Every Java program starts execution at `public static void main(String[] args)`.", "easy", True),
    ("java", "What is the size of an `int` in Java?",
     "2 bytes", "4 bytes", "8 bytes", "Depends on OS", "b",
     "In Java, `int` is always 32 bits (4 bytes), regardless of the platform.", "easy", False),
    ("java", "Which keyword is used to create a subclass in Java?",
     "implements", "extends", "inherits", "super", "b",
     "`extends` creates inheritance. e.g. `class Dog extends Animal {}`.", "easy", False),
    ("java", "What does JVM stand for?",
     "Java Virtual Memory", "Java Variable Machine", "Java Virtual Machine", "Java Verified Module", "c",
     "JVM (Java Virtual Machine) executes bytecode and provides platform independence.", "easy", True),
    ("java", "Which collection class in Java maintains insertion order and allows duplicates?",
     "HashSet", "TreeSet", "ArrayList", "HashMap", "c",
     "`ArrayList` is an ordered, indexed collection that allows duplicate elements.", "medium", False),

    # ── C++ ─────────────────────────────────────────────────────────────────
    ("cpp", "What is the correct syntax to declare a pointer in C++?",
     "int ptr;", "int *ptr;", "pointer int ptr;", "int &ptr;", "b",
     "`int *ptr;` declares a pointer to an integer. The `*` indicates it is a pointer.", "easy", True),
    ("cpp", "Which operator is used to access members through a pointer?",
     ".", "->", "::", "*", "b",
     "`->` accesses a member through a pointer. e.g. `ptr->value`.", "easy", False),
    ("cpp", "What is a constructor in C++?",
     "A function that destroys objects", "A function called automatically when an object is created",
     "A function that returns a value", "A static member function", "b",
     "A constructor initializes an object when it is created. It has the same name as the class.", "easy", False),
    ("cpp", "What does `virtual` keyword enable in C++?",
     "Compile-time binding", "Runtime polymorphism", "Memory allocation", "Exception handling", "b",
     "`virtual` functions enable runtime polymorphism through dynamic dispatch.", "medium", True),
    ("cpp", "What is the purpose of `delete` in C++?",
     "Remove a variable", "Free heap memory allocated with `new`", "Delete a file", "Remove a function", "b",
     "`delete` releases memory allocated with `new` to prevent memory leaks.", "medium", False),

    # ── DSA ─────────────────────────────────────────────────────────────────
    ("dsa", "What is the time complexity of binary search?",
     "O(n)", "O(n²)", "O(log n)", "O(1)", "c",
     "Binary search halves the search space each iteration, giving O(log n) time complexity.", "medium", True),
    ("dsa", "Which data structure uses LIFO (Last In, First Out) order?",
     "Queue", "Stack", "LinkedList", "Tree", "b",
     "A Stack follows LIFO — the last element pushed is the first to be popped.", "easy", False),
    ("dsa", "What is the worst-case time complexity of QuickSort?",
     "O(n log n)", "O(n)", "O(n²)", "O(log n)", "c",
     "QuickSort's worst case is O(n²) when the pivot is always the smallest or largest element.", "hard", False),
    ("dsa", "Which traversal of a Binary Search Tree gives elements in sorted order?",
     "Pre-order", "Post-order", "In-order", "Level-order", "c",
     "In-order traversal (Left → Root → Right) of a BST produces elements in ascending order.", "medium", True),
    ("dsa", "What data structure is used to implement a priority queue efficiently?",
     "Array", "Linked List", "Hash Table", "Heap", "d",
     "A Binary Heap supports O(log n) insert and O(1) max/min access, ideal for priority queues.", "medium", False),

    # ── DBMS ────────────────────────────────────────────────────────────────
    ("dbms", "What does ACID stand for in database transactions?",
     "Atomicity, Consistency, Isolation, Durability",
     "Availability, Consistency, Integrity, Durability",
     "Atomicity, Concurrency, Isolation, Distribution",
     "Availability, Concurrency, Integrity, Distribution", "a",
     "ACID ensures reliable transactions: Atomicity, Consistency, Isolation, Durability.", "medium", True),
    ("dbms", "What is the purpose of normalization in DBMS?",
     "To improve query speed", "To reduce data redundancy and dependency", "To increase storage", "To encrypt data", "b",
     "Normalization organizes data to reduce redundancy and improve data integrity.", "medium", False),
    ("dbms", "Which normal form eliminates partial dependencies?",
     "1NF", "2NF", "3NF", "BCNF", "b",
     "2NF eliminates partial dependencies — all non-key attributes must depend on the whole primary key.", "hard", False),
    ("dbms", "What is a foreign key?",
     "A key that uniquely identifies each row", "A key that links two tables", "A key used for encryption", "A key stored externally", "b",
     "A foreign key is a column that references the primary key of another table, establishing a relationship.", "easy", True),
    ("dbms", "What type of join returns all rows from both tables, with NULLs where there's no match?",
     "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "d",
     "FULL OUTER JOIN returns all rows from both tables. Non-matching rows get NULL for the other table's columns.", "medium", False),

    # ── SQL ─────────────────────────────────────────────────────────────────
    ("sql", "Which SQL clause is used to filter rows?",
     "ORDER BY", "GROUP BY", "WHERE", "HAVING", "c",
     "`WHERE` filters individual rows before grouping. `HAVING` filters after grouping.", "easy", True),
    ("sql", "What does `SELECT DISTINCT` do?",
     "Selects all rows", "Removes duplicate rows from the result", "Selects the first row only", "Sorts the result", "b",
     "`DISTINCT` removes duplicate rows from the query result.", "easy", False),
    ("sql", "Which aggregate function counts non-NULL values?",
     "SUM()", "AVG()", "COUNT(column)", "MAX()", "c",
     "`COUNT(column)` counts non-NULL values in that column. `COUNT(*)` counts all rows.", "medium", False),
    ("sql", "What is the correct order of SQL clauses?",
     "WHERE → FROM → SELECT", "SELECT → FROM → WHERE", "FROM → WHERE → SELECT", "SELECT → WHERE → FROM", "b",
     "SQL order: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.", "medium", True),
    ("sql", "Which SQL command removes all rows from a table but keeps its structure?",
     "DROP", "DELETE", "TRUNCATE", "REMOVE", "c",
     "`TRUNCATE` removes all rows quickly without logging individual row deletions. `DROP` removes the table itself.", "medium", False),

    # ── OS ──────────────────────────────────────────────────────────────────
    ("os", "What is a deadlock in an operating system?",
     "A process that uses too much CPU", "A situation where two or more processes wait for each other indefinitely",
     "A process that crashes", "A slow I/O operation", "b",
     "Deadlock occurs when processes wait circularly for resources held by each other.", "medium", True),
    ("os", "Which scheduling algorithm is non-preemptive?",
     "Round Robin", "SRTF", "FCFS", "Multilevel Queue", "c",
     "FCFS (First Come First Served) is non-preemptive — a process runs to completion before the next starts.", "medium", False),
    ("os", "What is virtual memory?",
     "RAM that is very fast", "A technique that uses disk space as an extension of RAM",
     "Memory used by the GPU", "Cache memory", "b",
     "Virtual memory extends RAM using disk space, allowing programs larger than physical RAM to run.", "medium", False),
    ("os", "What is the purpose of a semaphore?",
     "To allocate memory", "To synchronize access to shared resources",
     "To schedule processes", "To handle interrupts", "b",
     "Semaphores control access to shared resources, preventing race conditions.", "hard", True),
    ("os", "What is a context switch?",
     "Changing between light and dark mode", "Saving and restoring CPU state when switching processes",
     "Switching between RAM and disk", "Changing network connections", "b",
     "A context switch saves the state of the current process and loads the state of the next.", "medium", False),

    # ── Networks ────────────────────────────────────────────────────────────
    ("networks", "How many layers does the OSI model have?",
     "4", "5", "6", "7", "d",
     "OSI has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.", "easy", True),
    ("networks", "What does HTTP stand for?",
     "HyperText Transfer Protocol", "High Transfer Text Protocol", "Hyper Transfer Textual Protocol", "High Text Transfer Protocol", "a",
     "HTTP (HyperText Transfer Protocol) is the foundation of data communication on the web.", "easy", False),
    ("networks", "Which protocol is used for IP address assignment?",
     "FTP", "DNS", "DHCP", "SMTP", "c",
     "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses to devices.", "medium", False),
    ("networks", "What is the difference between TCP and UDP?",
     "TCP is faster, UDP is reliable", "TCP is reliable and connection-oriented; UDP is fast but connectionless",
     "They are the same", "UDP is used for files, TCP for video", "b",
     "TCP provides reliable, ordered delivery with handshaking. UDP is connectionless and faster but unreliable.", "medium", True),
    ("networks", "What layer of the OSI model does a router operate at?",
     "Data Link (Layer 2)", "Network (Layer 3)", "Transport (Layer 4)", "Physical (Layer 1)", "b",
     "Routers operate at Layer 3 (Network layer), making decisions based on IP addresses.", "medium", False),

    # ── Django ──────────────────────────────────────────────────────────────
    ("django", "What command creates a new Django project?",
     "django-admin startapp", "django-admin startproject", "python manage.py startproject", "pip install django-project", "b",
     "`django-admin startproject projectname` creates a new Django project structure.", "easy", True),
    ("django", "What file maps URLs to views in Django?",
     "models.py", "views.py", "urls.py", "settings.py", "c",
     "`urls.py` contains URL patterns that map to view functions or classes.", "easy", False),
    ("django", "What does Django's ORM stand for?",
     "Object Relational Mapping", "Object Resource Management", "Object Runtime Module", "Open Relational Model", "a",
     "ORM (Object Relational Mapping) lets you interact with the database using Python objects.", "easy", False),
    ("django", "Which decorator restricts a view to logged-in users?",
     "@auth_required", "@login_required", "@authenticated", "@user_required", "b",
     "`@login_required` redirects unauthenticated users to the login page.", "medium", True),
    ("django", "What command applies database migrations in Django?",
     "python manage.py migrate", "python manage.py makemigrations", "python manage.py syncdb", "django-admin migrate", "a",
     "`migrate` applies pending migrations. `makemigrations` creates migration files from model changes.", "easy", False),

    # ── React ───────────────────────────────────────────────────────────────
    ("react", "Which hook is used to manage state in a React functional component?",
     "useEffect", "useContext", "useState", "useReducer", "c",
     "`useState` returns a state variable and a setter function. e.g. `const [count, setCount] = useState(0)`.", "easy", True),
    ("react", "What does JSX stand for?",
     "JavaScript XML", "JavaScript Extension", "Java Syntax Extension", "JavaScript Execute", "a",
     "JSX (JavaScript XML) is a syntax extension that lets you write HTML-like code in JavaScript.", "easy", False),
    ("react", "Which hook runs side effects after a component renders?",
     "useState", "useCallback", "useEffect", "useMemo", "c",
     "`useEffect` runs after render. It replaces lifecycle methods like `componentDidMount`.", "medium", False),
    ("react", "What is the virtual DOM in React?",
     "A direct copy of the browser DOM", "A lightweight in-memory representation of the real DOM",
     "A database for React components", "A virtual machine for JavaScript", "b",
     "React uses a virtual DOM to efficiently compute minimal DOM updates before applying them.", "medium", True),
    ("react", "What is the purpose of the `key` prop in a list?",
     "To style list items", "To help React identify which items have changed in a list",
     "To set the order of items", "To bind event handlers", "b",
     "`key` helps React efficiently update and reorder list items by identifying each element uniquely.", "medium", False),

    # ── AI/ML ───────────────────────────────────────────────────────────────
    ("aiml", "What does ML stand for?",
     "Machine Logic", "Machine Learning", "Model Language", "Memory Layer", "b",
     "ML (Machine Learning) is a subset of AI where systems learn from data to make predictions.", "easy", True),
    ("aiml", "Which type of learning uses labeled training data?",
     "Unsupervised learning", "Reinforcement learning", "Supervised learning", "Transfer learning", "c",
     "Supervised learning trains on labeled data (input → expected output) to learn a mapping function.", "easy", False),
    ("aiml", "What is overfitting in machine learning?",
     "When a model is too simple", "When a model performs well on training data but poorly on new data",
     "When training data is too large", "When the model converges too fast", "b",
     "Overfitting means the model memorizes training data instead of generalizing to new examples.", "medium", False),
    ("aiml", "What does CNN stand for in deep learning?",
     "Central Neural Network", "Convolutional Neural Network", "Computed Node Network", "Connected Network Node", "b",
     "CNN (Convolutional Neural Network) is specialized for image recognition using convolution operations.", "medium", True),
    ("aiml", "Which algorithm is based on biological neurons?",
     "Decision Tree", "Linear Regression", "Neural Network", "K-Means Clustering", "c",
     "Neural networks are inspired by biological neurons and consist of layers of interconnected nodes.", "easy", False),
]


class Command(BaseCommand):
    help = "Seed Knowledge Arena topics and questions."

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding quiz topics…")
        topic_map = {}
        for name, slug, icon, color in TOPICS:
            obj, _ = QuizTopic.objects.get_or_create(
                slug=slug, defaults={"name": name, "icon": icon, "color": color}
            )
            topic_map[slug] = obj

        self.stdout.write("Seeding questions…")
        for row in QUESTIONS:
            (topic_slug, text, a, b, c, d, correct, explanation, difficulty, is_daily) = row
            topic = topic_map.get(topic_slug)
            if not topic:
                continue
            ArenaQuestion.objects.get_or_create(
                topic=topic, text=text,
                defaults={"option_a": a, "option_b": b, "option_c": c, "option_d": d,
                          "correct": correct, "explanation": explanation,
                          "difficulty": difficulty, "is_daily": is_daily}
            )

        # Update question counts
        for topic in QuizTopic.objects.all():
            topic.question_count = ArenaQuestion.objects.filter(topic=topic).count()
            topic.save(update_fields=["question_count"])

        self.stdout.write(self.style.SUCCESS(
            "\n✓ Arena seeded! {} topics, {} questions".format(
                QuizTopic.objects.count(), ArenaQuestion.objects.count()
            )
        ))
