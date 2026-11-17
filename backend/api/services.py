"""
AI services — Google Cloud Speech-to-Text, Translation, Text-to-Speech.
YouTube caption fetching via youtube-transcript-api v1.x.

Translation fallback: If Google Cloud is not configured, uses MyMemory API
(free, no key required, supports 50+ languages including Hindi, Punjabi,
Telugu, Tamil, Gujarati, Bengali, Portuguese, Spanish, French).

TTS fallback: If Google Cloud TTS is not configured, returns None gracefully.
"""
import os
import json
import tempfile
import logging
import time

logger = logging.getLogger(__name__)


class GoogleNotConfigured(Exception):
    pass


def _google_configured() -> bool:
    """Return True if a valid Google Cloud credentials file is present."""
    p = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    return bool(p and os.path.exists(p))


def _check():
    if not _google_configured():
        raise GoogleNotConfigured(
            "Google Cloud credentials not found. "
            "Set GOOGLE_APPLICATION_CREDENTIALS in backend/.env to a valid service-account JSON path."
        )


# ── Speech-to-Text ────────────────────────────────────────────────────────────

def speech_to_text(pcm16: bytes, lang: str = "en-US") -> str:
    """Convert raw PCM-16 mono 16 kHz audio bytes to text. Requires Google Cloud."""
    _check()
    from google.cloud import speech
    client = speech.SpeechClient()
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code=lang,
        enable_automatic_punctuation=True,
    )
    response = client.recognize(config=config, audio=speech.RecognitionAudio(content=pcm16))
    return " ".join(r.alternatives[0].transcript for r in response.results)


# ── Translation ───────────────────────────────────────────────────────────────
# Uses Google Cloud Translation if credentials are present, otherwise falls
# back to deep-translator (uses public Google Translate, no API key needed).def _translate_free(text: str, target: str, source: str = "en") -> str:
    """
    Translate text using translatepy — uses multiple free backends automatically,
    rotates between them to avoid rate limits. No API key required.
    Supports all Indian languages (Hindi, Punjabi, Telugu, Tamil, Gujarati, etc.)
    and European languages (Spanish, French, German, Portuguese).
    """
    if not text or not text.strip():
        return text
    try:
        from translatepy import Translator
        t = Translator()
        result = t.translate(text, target, source)
        return str(result)
    except Exception as e:
        logger.error("translatepy failed for %s->%s: %s", source, target, e)
        return text  # Return original rather than crashing


def translate(text: str, target: str, source: str = "en") -> str:
    """
    Translate text from source to target language.
    Uses Google Cloud if credentials are configured, otherwise translatepy
    (free, uses multiple public backends, no API key needed).
    """
    if target == source:
        return text
    if _google_configured():
        _check()
        from google.cloud import translate_v2 as tr
        client = tr.Client()
        result = client.translate(text, target_language=target, source_language=source)
        return result["translatedText"]
    else:
        logger.info("Google Cloud not configured — using translatepy (free) for %s->%s", source, target)
        return _translate_free(text, target, source)


def translate_chunks(chunks: list[str], target: str, source: str = "en") -> list[str]:
    """
    Batch-translate a list of text segments.
    Uses Google Cloud batch API if configured (1 API call for all chunks).
    Falls back to translatepy with merged batching to minimize requests.
    """
    if not chunks:
        return chunks
    if target == source:
        return list(chunks)

    if _google_configured():
        _check()
        from google.cloud import translate_v2 as tr
        client = tr.Client()
        BATCH = 128
        results = []
        for i in range(0, len(chunks), BATCH):
            batch = chunks[i:i + BATCH]
            resp = client.translate(batch, target_language=target, source_language=source)
            results.extend(r["translatedText"] for r in resp)
        return results
    else:
        logger.info("Google Cloud not configured — using translatepy (free) for %d chunks", len(chunks))
        return _translate_chunks_free(chunks, target, source)


def _translate_chunks_free(chunks: list[str], target: str, source: str = "en") -> list[str]:
    """
    Translate subtitle display blocks using translatepy.

    Strategy: Join up to 15 segments (~3000 chars) into one request separated by
    a distinctive marker. Translate as a single call. Split the result back.
    This maximises quality, minimises HTTP requests, and respects the free API.

    TIMEOUT: Hard limit of 60 seconds total. If exceeded, returns originals
    for remaining chunks (never infinite spinner).
    """
    if not chunks:
        return []

    TIMEOUT_SECS = 60
    SEP = " ||SEP|| "
    start_time = time.time()
    results = [""] * len(chunks)

    try:
        from translatepy import Translator
        translator = Translator()
    except Exception as e:
        logger.error("translatepy init failed: %s", e)
        return list(chunks)

    group_start = 0
    group_texts: list[str] = []
    group_len = 0

    def flush_group(g_start: int, g_texts: list[str]) -> None:
        if not g_texts:
            return
        combined = SEP.join(g_texts)
        try:
            translated_obj = translator.translate(combined, target, source)
            translated = str(translated_obj)
            # Split back using the separator (may survive translation slightly mangled)
            parts = translated.split("||SEP||")
            if len(parts) < len(g_texts):
                # Separator was mangled — try alternative splits
                parts = translated.split("| SEP |")
            if len(parts) < len(g_texts):
                parts = translated.split("SEP")
            for k in range(len(g_texts)):
                idx = g_start + k
                if k < len(parts):
                    results[idx] = parts[k].strip().strip("|").strip()
                    if not results[idx]:
                        results[idx] = g_texts[k]
                else:
                    results[idx] = g_texts[k]
        except Exception as e:
            logger.warning("Chunk group translation failed: %s — returning originals for %d chunks", e, len(g_texts))
            for k, orig in enumerate(g_texts):
                results[g_start + k] = orig
        time.sleep(0.1)

    for i, chunk in enumerate(chunks):
        # Check timeout
        if time.time() - start_time > TIMEOUT_SECS:
            logger.warning("Translation timeout — returning originals for remaining %d chunks", len(chunks) - i)
            for k in range(i, len(chunks)):
                results[k] = chunks[k]
            break

        candidate_len = group_len + len(chunk) + len(SEP)
        # Flush if adding this chunk would exceed 3000 chars or 15 segments
        if (candidate_len > 3000 or len(group_texts) >= 15) and group_texts:
            flush_group(group_start, group_texts)
            group_start = i
            group_texts = [chunk]
            group_len = len(chunk)
        else:
            group_texts.append(chunk)
            group_len = candidate_len

    if group_texts:
        flush_group(group_start, group_texts)

    # Ensure no empty slots
    for i in range(len(results)):
        if not results[i]:
            results[i] = chunks[i]

    return results


# ── Text-to-Speech ────────────────────────────────────────────────────────────

def text_to_speech(text: str, tts_code: str, speaking_rate: float = 1.0) -> bytes:
    """
    Return MP3 audio bytes for text spoken in tts_code voice.
    Requires Google Cloud TTS — no free fallback available for audio generation.
    """
    _check()
    from google.cloud import texttospeech as tts
    client = tts.TextToSpeechClient()
    response = client.synthesize_speech(
        input=tts.SynthesisInput(text=text),
        voice=tts.VoiceSelectionParams(
            language_code=tts_code,
            ssml_gender=tts.SsmlVoiceGender.NEUTRAL,
        ),
        audio_config=tts.AudioConfig(
            audio_encoding=tts.AudioEncoding.MP3,
            speaking_rate=speaking_rate,
        ),
    )
    return response.audio_content


def google_tts_available() -> bool:
    """Check if Google TTS can be used."""
    return _google_configured()


def generate_translated_audio_file(text: str, tts_code: str) -> str:
    """Translate text to speech, save to a temp file and return the file path."""
    audio = text_to_speech(text, tts_code)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(audio)
        return f.name


# ── YouTube caption fetch (youtube-transcript-api v1.x) ──────────────────────

def fetch_youtube_captions(video_id: str) -> list[dict] | None:
    """
    Fetch English captions from YouTube using youtube-transcript-api v1.x.
    Returns a list of segments: [{"start": 0.0, "dur": 4.1, "text": "..."}]
    or None if captions are unavailable.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id, languages=["en", "en-US"])
        segments = []
        for snippet in fetched:
            segments.append({
                "start": round(snippet.start, 2),
                "dur": round(snippet.duration, 2) if hasattr(snippet, "duration") else 0,
                "text": snippet.text.strip(),
            })
        if not segments:
            logger.warning("YouTube captions returned 0 segments for %s", video_id)
            return None
        logger.info("Fetched %d caption segments for video %s", len(segments), video_id)
        return segments
    except Exception as exc:
        logger.warning("YouTube captions unavailable for %s: %s (%s)", video_id, exc, type(exc).__name__)
        return None


def fetch_youtube_captions_text(video_id: str) -> str | None:
    """Return captions as a single plain-text string (no timestamps)."""
    segments = fetch_youtube_captions(video_id)
    if not segments:
        return None
    return " ".join(s["text"] for s in segments)


# ── SRT/VTT parsing for teacher uploads ───────────────────────────────────────

def parse_srt(content: str) -> list[dict]:
    """Parse SRT subtitle file content into segments."""
    segments = []
    blocks = content.strip().split("\n\n")
    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue
        ts_line = lines[1]
        if "-->" not in ts_line:
            continue
        start_str, end_str = ts_line.split("-->")
        start = _srt_time_to_seconds(start_str.strip())
        end = _srt_time_to_seconds(end_str.strip())
        text = " ".join(lines[2:]).strip()
        if text:
            segments.append({"start": start, "dur": round(end - start, 2), "text": text})
    return segments


def parse_vtt(content: str) -> list[dict]:
    """Parse WebVTT subtitle file content into segments."""
    lines = content.strip().split("\n")
    if lines and lines[0].startswith("WEBVTT"):
        lines = lines[1:]
    text = "\n".join(lines)
    text = text.replace(".", ",")
    return parse_srt(text)


def _srt_time_to_seconds(time_str: str) -> float:
    """Convert SRT timestamp (00:01:23,456) to seconds (83.456)."""
    time_str = time_str.replace(",", ".")
    parts = time_str.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(time_str)
