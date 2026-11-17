"""
Management command: python manage.py seed_legends
Seeds LegendCategory, Legend, StoryPanel and QuizQuestion data.
Images served from /personalities/ (Vite public folder).
"""
from django.core.management.base import BaseCommand
from api.models import LegendCategory, Legend, StoryPanel, QuizQuestion


CATEGORIES = [
    ("Indian Legends",        "indian-legends",       "🇮🇳", "from-orange-500 to-green-600",  "Great souls born on Indian soil who shaped history."),
    ("Scientists & Inventors","scientists-inventors", "🔬", "from-blue-500 to-cyan-600",     "Brilliant minds who changed how we understand the universe."),
    ("Freedom Fighters",      "freedom-fighters",     "✊", "from-red-600 to-orange-500",    "Courageous heroes who sacrificed everything for liberty."),
    ("Great Leaders",         "great-leaders",        "👑", "from-purple-600 to-indigo-600", "Visionary leaders who guided nations and movements."),
    ("Global Legends",        "global-legends",       "🌍", "from-teal-500 to-blue-600",     "Icons from around the world who left a lasting legacy."),
]

# Each row: (slug, name, name_hi, cat_slug, born, died, nationality, tagline, tagline_hi,
#            cover_emoji, cover_color, overview, overview_hi, order, photo_url, photo_attr)
# photo_url is a root-relative path served by Vite's public folder → /personalities/xxx.png
LEGENDS = [
    (
        "mahatma-gandhi", "Mahatma Gandhi", "महात्मा गांधी", "indian-legends",
        "2 October 1869", "30 January 1948", "Indian",
        "Father of the Nation — led India to independence through nonviolent resistance",
        "राष्ट्रपिता — अहिंसक प्रतिरोध से भारत को स्वतंत्रता दिलाई",
        "🕊️", "from-amber-400 to-orange-500",
        "Mohandas Karamchand Gandhi, known as Mahatma ('Great Soul'), was the primary leader of India's independence movement. Through nonviolent civil disobedience, he inspired movements for civil rights and freedom across the world.",
        "मोहनदास करमचंद गांधी, जिन्हें महात्मा ('महान आत्मा') के नाम से जाना जाता है, भारत के स्वतंत्रता आंदोलन के प्रमुख नेता थे।",
        1, "/personalities/gandhi.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "apj-abdul-kalam", "Dr. APJ Abdul Kalam", "डॉ. ए.पी.जे. अब्दुल कलाम", "scientists-inventors",
        "15 October 1931", "27 July 2015", "Indian",
        "Missile Man of India — scientist, President, and eternal inspiration to millions",
        "भारत के मिसाइल मैन — वैज्ञानिक, राष्ट्रपति और लाखों लोगों की प्रेरणा",
        "🚀", "from-blue-600 to-indigo-700",
        "Avul Pakir Jainulabdeen Abdul Kalam was an aerospace scientist who served as the 11th President of India from 2002 to 2007. Known as the Missile Man of India, he played a pivotal role in India's civilian space programme and military missile development.",
        "अवुल पकिर जैनुलाब्दीन अब्दुल कलाम एक एयरोस्पेस वैज्ञानिक थे जिन्होंने 2002 से 2007 तक भारत के 11वें राष्ट्रपति के रूप में कार्य किया।",
        2, "/personalities/apj_kalam.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "albert-einstein", "Albert Einstein", "अल्बर्ट आइंस्टीन", "scientists-inventors",
        "14 March 1879", "18 April 1955", "German-American",
        "Changed our understanding of space, time and the universe with the Theory of Relativity",
        "सापेक्षता के सिद्धांत से ब्रह्मांड की हमारी समझ को बदल दिया",
        "⚛️", "from-yellow-400 to-orange-500",
        "Albert Einstein was a German-born theoretical physicist who developed the theory of relativity. He received the Nobel Prize in Physics in 1921. His name has become synonymous with genius.",
        "अल्बर्ट आइंस्टीन एक जर्मन मूल के सैद्धांतिक भौतिक विज्ञानी थे जिन्होंने सापेक्षता का सिद्धांत विकसित किया।",
        3, "/personalities/albert_einstein.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "swami-vivekananda", "Swami Vivekananda", "स्वामी विवेकानंद", "indian-legends",
        "12 January 1863", "4 July 1902", "Indian",
        "Introduced Indian philosophies of Vedanta and Yoga to the Western world",
        "वेदांत और योग के दर्शन को पश्चिमी दुनिया से परिचित कराया",
        "🕉️", "from-orange-500 to-amber-600",
        "Swami Vivekananda was a key figure in introducing Indian philosophy of Vedanta and Yoga to the Western world and is credited with raising interfaith awareness.",
        "स्वामी विवेकानंद वेदांत और योग को पश्चिमी दुनिया से परिचित कराने में महत्वपूर्ण भूमिका निभाई।",
        4, "/personalities/swami_vivekananda.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "bhagat-singh", "Bhagat Singh", "भगत सिंह", "freedom-fighters",
        "28 September 1907", "23 March 1931", "Indian",
        "Revolutionary freedom fighter who gave his life at age 23 for India's independence",
        "23 साल की उम्र में भारत की आजादी के लिए जीवन दे देने वाले क्रांतिकारी",
        "⚡", "from-red-600 to-rose-700",
        "Bhagat Singh was a revolutionary socialist who is considered one of the most influential revolutionaries of the Indian independence movement.",
        "भगत सिंह एक क्रांतिकारी समाजवादी थे जिन्हें भारत के स्वतंत्रता आंदोलन के सबसे प्रभावशाली क्रांतिकारियों में से एक माना जाता है।",
        5, "/personalities/bhagat_singh.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "subhas-chandra-bose", "Subhas Chandra Bose", "सुभाष चंद्र बोस", "freedom-fighters",
        "23 January 1897", "18 August 1945", "Indian",
        "Netaji — led the Indian National Army with the battle cry 'Give me blood and I will give you freedom'",
        "नेताजी — 'तुम मुझे खून दो, मैं तुम्हें आजादी दूंगा' के नारे के साथ INA का नेतृत्व किया",
        "🦁", "from-green-600 to-teal-700",
        "Subhas Chandra Bose, known as Netaji, was an Indian nationalist whose defiant patriotism and organisation of the Indian National Army made him a hero in India.",
        "सुभाष चंद्र बोस, जिन्हें नेताजी के नाम से जाना जाता है, एक भारतीय राष्ट्रवादी थे।",
        6, "/personalities/subhas_chandra_bose.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "rani-lakshmibai", "Rani Lakshmibai", "रानी लक्ष्मीबाई", "freedom-fighters",
        "19 November 1828", "18 June 1858", "Indian",
        "The warrior queen of Jhansi who fought fearlessly against British rule",
        "झाँसी की वीर रानी जिसने ब्रिटिश शासन के विरुद्ध निडरता से लड़ाई लड़ी",
        "⚔️", "from-purple-600 to-pink-600",
        "Rani Lakshmibai was the Queen of the princely state of Jhansi and one of the leading figures of the Indian Rebellion of 1857, an icon of resistance to the British Raj.",
        "रानी लक्ष्मीबाई झाँसी की रानी थीं और 1857 के भारतीय विद्रोह की प्रमुख नेता थीं।",
        7, "/personalities/rani_lakshmibai.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "srinivasa-ramanujan", "Srinivasa Ramanujan", "श्रीनिवास रामानुजन", "scientists-inventors",
        "22 December 1887", "26 April 1920", "Indian",
        "Self-taught mathematical genius who made extraordinary contributions to number theory",
        "स्व-शिक्षित गणितीय प्रतिभा जिन्होंने संख्या सिद्धांत में अभूतपूर्व योगदान दिया",
        "∞", "from-indigo-500 to-purple-600",
        "Srinivasa Ramanujan was an Indian mathematician who made extraordinary contributions to mathematical analysis, number theory, infinite series, and continued fractions.",
        "श्रीनिवास रामानुजन एक भारतीय गणितज्ञ थे जिन्होंने गणितीय विश्लेषण और संख्या सिद्धांत में असाधारण योगदान दिया।",
        8, "/personalities/srinivasa_ramanujan.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "nikola-tesla", "Nikola Tesla", "निकोला टेस्ला", "scientists-inventors",
        "10 July 1856", "7 January 1943", "Serbian-American",
        "Inventor of alternating current — the electricity that powers the modern world",
        "प्रत्यावर्ती धारा के आविष्कारक — आधुनिक विश्व को बिजली देने वाले",
        "⚡", "from-cyan-500 to-blue-600",
        "Nikola Tesla was a Serbian-American inventor best known for his contributions to the design of the modern alternating current electricity supply system.",
        "निकोला टेस्ला एक सर्बियाई-अमेरिकी आविष्कारक थे जो प्रत्यावर्ती धारा विद्युत आपूर्ति प्रणाली के लिए जाने जाते हैं।",
        9, "/personalities/nikola_tesla.png", "Comic illustration — LinguaLearn AI"
    ),
    (
        "marie-curie", "Marie Curie", "मैरी क्यूरी", "global-legends",
        "7 November 1867", "4 July 1934", "Polish-French",
        "First woman to win the Nobel Prize — won it twice in two different sciences",
        "नोबेल पुरस्कार जीतने वाली पहली महिला — दो अलग विज्ञानों में दो बार",
        "☢️", "from-teal-500 to-green-600",
        "Marie Curie was a Polish and naturalised-French physicist and chemist who conducted pioneering research on radioactivity. She was the first woman to win a Nobel Prize.",
        "मैरी क्यूरी एक पोलिश-फ्रांसीसी भौतिक विज्ञानी और रसायनशास्त्री थीं जिन्होंने रेडियोधर्मिता पर अग्रणी शोध किया।",
        10, "/personalities/marie_curie.png", "Comic illustration — LinguaLearn AI"
    ),
]


# ── Complete story panels ──────────────────────────────────────────────────────

GANDHI_PANELS = [
    (1, "cover", "Mahatma Gandhi", "महात्मा गांधी",
     "Born on 2 October 1869 in Porbandar, a small coastal town in Gujarat, Mohandas Karamchand Gandhi would grow up to become the Father of the Nation — leading the largest nonviolent independence movement in history.",
     "भारत के राष्ट्रपिता महात्मा गांधी का जन्म 2 अक्टूबर 1869 को गुजरात के पोरबंदर में हुआ था।",
     "", "", "🕊️", "from-amber-400 via-orange-400 to-yellow-300", "1869"),

    (2, "childhood", "A Shy Child from Porbandar", "पोरबंदर का एक शर्मीला बालक",
     "Mohan was a shy, timid child who feared the dark. His deeply religious mother Putlibai instilled in him the values of fasting, prayer and service. These early influences shaped his entire life.",
     "मोहन एक शर्मीला और डरपोक बच्चा था। उनकी माँ पुतलीबाई ने उनमें उपवास, प्रार्थना और सेवा के मूल्य भरे।",
     "", "", "🏠", "from-green-400 to-emerald-500", "1875"),

    (3, "education", "South Africa Changes Everything", "दक्षिण अफ्रीका ने सब बदल दिया",
     "In 1893, Gandhi was thrown off a train at Pietermaritzburg despite holding a first-class ticket, solely because of his race. This injustice awakened a fire within him — and Satyagraha was born.",
     "1893 में दक्षिण अफ्रीका में उन्हें प्रथम श्रेणी टिकट होने के बावजूद ट्रेन से बाहर फेंक दिया गया। इस अन्याय ने सत्याग्रह को जन्म दिया।",
     "", "", "🚂", "from-red-500 to-orange-600", "1893"),

    (4, "challenge", "Birth of Satyagraha", "सत्याग्रह का जन्म",
     "Gandhi spent 21 years in South Africa fighting for the rights of Indian immigrants. He developed Satyagraha — 'insistence on truth' — as a tool of nonviolent resistance. Through peaceful protests, he won important rights without firing a single bullet.",
     "गांधी ने दक्षिण अफ्रीका में 21 वर्ष बिताए और सत्याग्रह — 'सत्य पर जोर' — का दर्शन विकसित किया।",
     "", "", "✊", "from-purple-500 to-indigo-600", "1906"),

    (5, "event", "Return to India", "भारत वापसी",
     "Gandhi returned to India in 1915. For a year he travelled across India by train in third class, learning about the poverty of ordinary Indians. What he saw moved him deeply and prepared him for the great struggle ahead.",
     "1915 में गांधी भारत लौटे। उन्होंने तीसरी श्रेणी में ट्रेन से पूरे भारत की यात्रा की और आम भारतीयों की पीड़ा को जाना।",
     "", "", "🚂", "from-teal-500 to-cyan-600", "1915"),

    (6, "achievement", "The Salt March", "नमक मार्च",
     "On 12 March 1930, Gandhi led the famous 390-kilometre Dandi March to protest the British salt tax. He picked up a lump of salt from the beach on 6 April. This simple act sparked a nationwide movement and shook the British Empire.",
     "12 मार्च 1930 को गांधी ने प्रसिद्ध 390 किलोमीटर दांडी मार्च का नेतृत्व किया। समुद्र तट से नमक उठाने के उनके साधारण कार्य ने पूरे देश में आंदोलन की लहर पैदा कर दी।",
     "", "", "🌊", "from-blue-500 to-teal-600", "1930"),

    (7, "achievement", "Quit India — The Final Push", "भारत छोड़ो — अंतिम प्रहार",
     "On 8 August 1942, Gandhi launched the Quit India Movement with the rallying cry 'Do or Die'. He and thousands of Congress leaders were immediately arrested. Despite crackdowns, independence was now inevitable.",
     "8 अगस्त 1942 को गांधी ने 'करो या मरो' के नारे के साथ भारत छोड़ो आंदोलन शुरू किया।",
     "", "", "🏛️", "from-orange-600 to-red-600", "1942"),

    (8, "legacy", "Independence at Last", "अंततः स्वतंत्रता",
     "India gained independence on 15 August 1947. However, the partition of India and Pakistan brought devastating violence that distressed Gandhi deeply. He spent his final months working tirelessly for communal peace.",
     "15 अगस्त 1947 को भारत को स्वतंत्रता मिली। लेकिन विभाजन की हिंसा ने गांधी को गहरा आघात पहुँचाया।",
     "", "", "🇮🇳", "from-green-500 to-orange-500", "1947"),

    (9, "lesson", "What Gandhi Teaches Us", "गांधी हमें क्या सिखाते हैं",
     "Gandhi's life teaches us that nonviolence is not weakness — it is the highest form of courage. He showed that one person with truth on their side can challenge the most powerful empire.",
     "गांधी का जीवन हमें सिखाता है कि अहिंसा कमज़ोरी नहीं — यह सर्वोच्च साहस है। एक व्यक्ति, सत्य के साथ, सबसे शक्तिशाली साम्राज्य को चुनौती दे सकता है।",
     "", "", "📖", "from-amber-400 to-yellow-500", ""),
]

KALAM_PANELS = [
    (1, "cover", "Dr. APJ Abdul Kalam", "डॉ. ए.पी.जे. अब्दुल कलाम",
     "Born on 15 October 1931 in Rameswaram, Tamil Nadu, the son of a boat owner who sold newspapers on trains would one day send India's missiles into the sky and lead the nation as its beloved President.",
     "15 अक्टूबर 1931 को रामेश्वरम, तमिलनाडु में जन्मे अब्दुल कलाम एक नाव मालिक के बेटे थे जो ट्रेनों पर अखबार बेचते थे।",
     "", "", "🚀", "from-blue-600 via-indigo-600 to-purple-700", "1931"),

    (2, "childhood", "The Newspaper Boy of Rameswaram", "रामेश्वरम का अखबार वाला लड़का",
     "Kalam grew up in a modest family in Rameswaram. From a very young age he distributed newspapers to help the family. Despite hardship, his parents ensured their children received education. His father often said wisdom comes from perseverance.",
     "कलाम रामेश्वरम में एक साधारण परिवार में पले-बढ़े। परिवार की मदद के लिए वे बचपन से ही अखबार बाँटते थे।",
     "", "", "📰", "from-amber-500 to-orange-600", "1940"),

    (3, "education", "Dreams Take Flight", "सपने उड़ान भरते हैं",
     "Watching birds fly along Rameswaram's coast fascinated young Kalam. He studied aeronautical engineering at the Madras Institute of Technology. He dreamed of becoming a fighter pilot but missed selection by a narrow margin — redirecting his genius toward something greater.",
     "समुद्र तट पर पक्षियों को उड़ते देखना युवा कलाम को मोहित करता था। एमआईटी से वैमानिकी इंजीनियरिंग की पढ़ाई के बाद उन्होंने अपना रास्ता चुना।",
     "", "", "✈️", "from-sky-500 to-blue-600", "1954"),

    (4, "achievement", "Rocket Man of ISRO", "इसरो के रॉकेट मैन",
     "Kalam joined ISRO in 1969 as project director of India's first indigenous satellite launch vehicle — SLV-3. On 18 July 1980, SLV-3 successfully placed the Rohini satellite in orbit, making India one of a select group of space-faring nations.",
     "1969 में कलाम इसरो से जुड़े। 18 जुलाई 1980 को SLV-3 ने रोहिणी उपग्रह को सफलतापूर्वक कक्षा में स्थापित किया।",
     "", "", "🛸", "from-indigo-500 to-blue-700", "1980"),

    (5, "achievement", "Missile Man of India", "भारत के मिसाइल मैन",
     "Kalam led India's Integrated Guided Missile Development Programme (IGMDP), successfully developing Agni, Prithvi, Akash, Trishul and Nag missiles. His work gave India strategic autonomy and earned him the Bharat Ratna in 1997.",
     "कलाम ने IGMDP का नेतृत्व किया और अग्नि, पृथ्वी, आकाश, त्रिशूल और नाग मिसाइलें विकसित कीं। उन्हें 1997 में भारत रत्न से सम्मानित किया गया।",
     "", "", "🎯", "from-red-500 to-orange-600", "1997"),

    (6, "event", "The People's President", "जनता के राष्ट्रपति",
     "In 2002, Kalam was elected as the 11th President of India — the first scientist to hold the office. He was beloved by young people and spent his presidency inspiring millions of students. He called himself 'a teacher who happened to become President'.",
     "2002 में कलाम भारत के 11वें राष्ट्रपति बने। वे युवाओं के प्रिय थे और खुद को 'राष्ट्रपति बने शिक्षक' कहते थे।",
     "", "", "🏛️", "from-purple-500 to-indigo-600", "2002"),

    (7, "legacy", "Teaching to the Last Day", "अंतिम दिन तक पढ़ाना",
     "On 27 July 2015, while delivering a lecture at IIM Shillong on creating a livable planet, Kalam collapsed on stage and passed away. He died doing what he loved most — teaching young people.",
     "27 जुलाई 2015 को IIM शिलांग में व्याख्यान देते समय कलाम मंच पर गिर पड़े और उनका निधन हो गया। वे वही कर रहे थे जो उन्हें सबसे अधिक पसंद था।",
     "", "", "⭐", "from-teal-500 to-cyan-600", "2015"),

    (8, "lesson", "Wings of Fire — What Kalam Teaches Us", "अग्नि की उड़ान — कलाम हमें क्या सिखाते हैं",
     "Kalam's life teaches us that dreams know no boundaries of poverty or background. His words: 'You have to dream before your dreams can come true.' He believed every child is special and that great teachers shape great nations.",
     "कलाम का जीवन सिखाता है कि सपनों की कोई सीमा नहीं होती। उनके प्रसिद्ध शब्द: 'सपना सच होने से पहले आपको सपना देखना होगा।'",
     "", "", "🌟", "from-amber-400 to-yellow-500", ""),
]

EINSTEIN_PANELS = [
    (1, "cover", "Albert Einstein", "अल्बर्ट आइंस्टीन",
     "Born on 14 March 1879 in Ulm, Germany, Albert Einstein would grow up to fundamentally change how humanity understands space, time, gravity and the universe itself.",
     "14 मार्च 1879 को जर्मनी के उल्म में जन्मे अल्बर्ट आइंस्टीन ने ब्रह्मांड के बारे में मानवता की समझ को मूल रूप से बदल दिया।",
     "", "", "⚛️", "from-yellow-400 via-amber-400 to-orange-500", "1879"),

    (2, "childhood", "The Late Talker Who Loved Puzzles", "देर से बोलने वाला जो पहेलियाँ सुलझाता था",
     "Albert was slow to talk as a child and was labeled 'mentally slow' by some teachers. Yet at age 5, his father gave him a compass — Einstein was fascinated that the needle always pointed north, as if guided by an invisible force. That curiosity never left him.",
     "आइंस्टीन बचपन में देर से बोले और कुछ शिक्षकों ने उन्हें 'धीमा' कहा। फिर भी 5 साल की उम्र में एक कम्पास ने उनमें अदृश्य बलों के प्रति जिज्ञासा जगाई।",
     "", "", "🧭", "from-blue-400 to-indigo-500", "1884"),

    (3, "education", "Expelled and Enlightened", "निष्कासित और प्रबुद्ध",
     "Einstein dropped out of school at 15 and failed his entrance exam to ETH Zurich on the first attempt. Despite this setback, he was admitted after completing a preparatory school and graduated in 1900 in physics and mathematics.",
     "आइंस्टीन 15 साल की उम्र में स्कूल छोड़ दिया और ETH ज्यूरिख की प्रवेश परीक्षा पहले प्रयास में फेल हो गए। फिर भी उन्होंने 1900 में भौतिकी में स्नातक किया।",
     "", "", "🎓", "from-green-500 to-teal-600", "1900"),

    (4, "challenge", "Patent Clerk With a Universe in His Mind", "दिमाग में ब्रह्मांड लेकर पेटेंट क्लर्क",
     "Einstein could not find a teaching position after graduation and took a job as a patent clerk in Bern. While reviewing other people's inventions by day, he spent evenings developing revolutionary ideas. He called 1905 his 'miracle year'.",
     "स्नातक होने के बाद आइंस्टीन को कोई नौकरी नहीं मिली। उन्होंने पेटेंट कार्यालय में क्लर्क की नौकरी की। दिन में पेटेंट जाँचते और रात को भौतिकी की दुनिया बदलते।",
     "", "", "📋", "from-orange-500 to-red-500", "1905"),

    (5, "achievement", "The Miracle Year — 1905", "चमत्कारी वर्ष — 1905",
     "In 1905, Einstein published four papers that revolutionised physics: the photoelectric effect, Brownian motion, special relativity, and the famous equation E=mc², which revealed the relationship between mass and energy.",
     "1905 में, अभी भी पेटेंट क्लर्क रहते हुए, आइंस्टीन ने चार क्रांतिकारी शोधपत्र प्रकाशित किए, जिनमें विशेष सापेक्षता और प्रसिद्ध E=mc² शामिल थे।",
     "", "", "⚡", "from-yellow-500 to-amber-600", "1905"),

    (6, "achievement", "General Relativity — Gravity Reimagined", "सामान्य सापेक्षता — गुरुत्वाकर्षण की पुनर्कल्पना",
     "In 1915, Einstein published his General Theory of Relativity, reimagining gravity not as a force but as a curvature of spacetime. His predictions were confirmed in 1919 when astronomers observed light bending around the Sun. He became world-famous overnight.",
     "1915 में आइंस्टीन ने सामान्य सापेक्षता का सिद्धांत प्रकाशित किया। 1919 में सूर्यग्रहण के दौरान उनकी भविष्यवाणी सही साबित हुई — रातोरात वे विश्व प्रसिद्ध हो गए।",
     "", "", "🌌", "from-indigo-600 to-purple-700", "1915"),

    (7, "event", "Nobel Prize and Exile", "नोबेल पुरस्कार और निर्वासन",
     "Einstein won the Nobel Prize in Physics in 1921 for his explanation of the photoelectric effect. When the Nazis rose to power in 1933, Einstein — who was Jewish — was in the United States. He never returned to Germany and became an American citizen in 1940.",
     "1921 में आइंस्टीन को भौतिकी का नोबेल पुरस्कार मिला। 1933 में नाजियों के उदय के बाद वे अमेरिका में ही रह गए।",
     "", "", "🏆", "from-amber-400 to-yellow-500", "1921"),

    (8, "legacy", "The Legacy of a Curious Mind", "एक जिज्ञासु दिमाग की विरासत",
     "Einstein died on 18 April 1955. His theories underpin GPS navigation, lasers, solar panels and much of modern technology. His famous equation E=mc² remains one of the most recognisable scientific statements in history.",
     "18 अप्रैल 1955 को आइंस्टीन का निधन हुआ। उनके सिद्धांत GPS, लेजर, सौर पैनल और परमाणु ऊर्जा के आधार हैं।",
     "", "", "🌟", "from-teal-500 to-blue-600", "1955"),

    (9, "lesson", "What Einstein Teaches Us", "आइंस्टीन हमें क्या सिखाते हैं",
     "Einstein's life teaches us never to judge intelligence by test scores or early performance. He showed that curiosity, persistence and independent thinking are more valuable than memorization. 'Imagination is more important than knowledge.'",
     "आइंस्टीन का जीवन सिखाता है कि परीक्षा के अंकों से बुद्धि नहीं मापी जाती। जिज्ञासा, दृढ़ता और स्वतंत्र सोच ज्ञान से अधिक मूल्यवान है।",
     "", "", "📚", "from-amber-400 to-yellow-500", ""),
]

GANDHI_QUIZ = [
    (1, "In what year was Mahatma Gandhi born?", "1869", "1876", "1858", "1900", "a", "Gandhi was born on 2 October 1869 in Porbandar, Gujarat."),
    (2, "What is 'Satyagraha'?", "A type of weapon", "Insistence on truth / nonviolent resistance", "A meditation practice", "A festival", "b", "Satyagraha means insistence on truth — the philosophy of nonviolent resistance Gandhi developed in South Africa."),
    (3, "What was the Salt March of 1930?", "A march to a salt factory", "A march to protest salt taxes by making salt from the sea", "A salt trade agreement with Britain", "A religious pilgrimage", "b", "Gandhi led a 390-km march to Dandi to defy the British salt tax by making salt from seawater."),
    (4, "What was Gandhi's famous 1942 movement called?", "Non-Cooperation Movement", "Civil Disobedience Movement", "Quit India Movement", "Swadeshi Movement", "c", "The Quit India Movement of 1942 was Gandhi's last major campaign demanding immediate British withdrawal from India."),
]

KALAM_QUIZ = [
    (1, "What was APJ Abdul Kalam's childhood job?", "Fishing", "Selling newspapers", "Farming", "Teaching", "b", "Kalam sold newspapers in Rameswaram to help support his family financially."),
    (2, "What does ISRO stand for?", "Indian Space Research Organisation", "International Space Research Organisation", "Indian Scientific Research Organisation", "Indian Satellite and Rocket Organisation", "a", "ISRO is the Indian Space Research Organisation, where Kalam was project director of SLV-3."),
    (3, "What nickname was given to Kalam for his work on missiles?", "Rocket Man", "Missile Man of India", "Space Pioneer", "Defence Scientist", "b", "Kalam was called the Missile Man of India for leading the IGMDP that developed Agni, Prithvi and other missiles."),
    (4, "Which prestigious award did Kalam receive in 1997?", "Padma Bhushan", "Padma Vibhushan", "Bharat Ratna", "Nobel Prize", "c", "Kalam received the Bharat Ratna — India's highest civilian honour — in 1997."),
]

EINSTEIN_QUIZ = [
    (1, "What is Einstein's famous equation relating mass and energy?", "F=ma", "E=mc²", "PV=nRT", "a²+b²=c²", "b", "E=mc² means energy equals mass times the speed of light squared — revealing the enormous energy stored in matter."),
    (2, "For which discovery did Einstein win the Nobel Prize in Physics?", "Theory of Relativity", "Atomic Bomb", "Photoelectric Effect", "Brownian Motion", "c", "Einstein won the 1921 Nobel Prize for his explanation of the photoelectric effect, not for relativity."),
    (3, "What year was Einstein's 'Miracle Year'?", "1900", "1905", "1915", "1921", "b", "1905 was Einstein's Annus Mirabilis when he published four revolutionary papers while working as a patent clerk."),
    (4, "Einstein's General Theory of Relativity reimagined which force?", "Electricity", "Magnetism", "Gravity", "Nuclear force", "c", "General Relativity reimagined gravity — not as a force but as a curvature of spacetime caused by mass."),
]


class Command(BaseCommand):
    help = "Seed Legends & Life Stories data with real personality photos."

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding legend categories…")
        cat_map = {}
        for name, slug, icon, color, desc in CATEGORIES:
            obj, _ = LegendCategory.objects.get_or_create(
                slug=slug, defaults={"name": name, "icon": icon, "color": color, "description": desc}
            )
            cat_map[slug] = obj

        self.stdout.write("Seeding legends with photos…")
        legend_map = {}
        for row in LEGENDS:
            (slug, name, name_hi, cat_slug, born, died, nat, tagline, tagline_hi,
             emoji, color, overview, overview_hi, order, photo_url, photo_attr) = row
            obj, created = Legend.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name, "name_hi": name_hi,
                    "category": cat_map[cat_slug],
                    "born": born, "died": died, "nationality": nat,
                    "tagline": tagline, "tagline_hi": tagline_hi,
                    "cover_emoji": emoji, "cover_color": color,
                    "overview": overview, "overview_hi": overview_hi,
                    "photo_url": photo_url, "photo_attribution": photo_attr,
                    "order": order,
                },
            )
            if not created:
                # Always update photo fields
                Legend.objects.filter(slug=slug).update(
                    photo_url=photo_url, photo_attribution=photo_attr
                )
            legend_map[slug] = obj

        self.stdout.write("Seeding story panels for Gandhi, Kalam, Einstein…")
        for slug, panels_data in [
            ("mahatma-gandhi", GANDHI_PANELS),
            ("apj-abdul-kalam", KALAM_PANELS),
            ("albert-einstein", EINSTEIN_PANELS),
        ]:
            legend = legend_map[slug]
            StoryPanel.objects.filter(legend=legend).delete()
            for row in panels_data:
                (order, ptype, title, title_hi, narration, narration_hi,
                 bubble, bubble_hi, emoji, bg, year) = row
                StoryPanel.objects.create(
                    legend=legend, order=order, panel_type=ptype,
                    title=title, title_hi=title_hi,
                    narration=narration, narration_hi=narration_hi,
                    speech_bubble=bubble, speech_bubble_hi=bubble_hi,
                    emoji=emoji, bg_color=bg, year_label=year,
                )

        self.stdout.write("Seeding quiz questions…")
        for slug, quiz_data in [
            ("mahatma-gandhi", GANDHI_QUIZ),
            ("apj-abdul-kalam", KALAM_QUIZ),
            ("albert-einstein", EINSTEIN_QUIZ),
        ]:
            legend = legend_map[slug]
            QuizQuestion.objects.filter(legend=legend).delete()
            for order, q, a, b, c, d, correct, explanation in quiz_data:
                QuizQuestion.objects.create(
                    legend=legend, order=order,
                    question=q, option_a=a, option_b=b, option_c=c, option_d=d,
                    correct=correct, explanation=explanation,
                )

        self.stdout.write(self.style.SUCCESS(
            "\n✓ Legends seeded with photos!\n"
            "  {} categories, {} legends, {} panels, {} quiz questions".format(
                LegendCategory.objects.count(),
                Legend.objects.count(),
                StoryPanel.objects.count(),
                QuizQuestion.objects.count(),
            )
        ))
