"""
WebSocket consumer for live multilingual classes.
Teacher speaks → Google STT → broadcast text → each student's connection
translates to their chosen language and returns TTS audio.
"""
import base64
import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async

from . import services
from .models import Language, LiveClass, Transcript

logger = logging.getLogger(__name__)


class LiveConsumer(AsyncJsonWebsocketConsumer):
    """
    Protocol:
      Client → server:
        { "type": "set_language", "code": "hi" }
        { "type": "audio", "data": "<base64 PCM-16 mono 16 kHz>" }   # teacher only

      Server → client:
        { "type": "caption", "original": "...", "text": "...", "audio": "<base64 mp3>" }
        { "type": "error",   "message": "..." }
    """

    async def connect(self):
        self.class_id = self.scope["url_route"]["kwargs"]["class_id"]
        self.group_name = f"live_{self.class_id}"

        # Authenticate via ?token=<JWT>
        qs = dict(x.split("=", 1) for x in self.scope["query_string"].decode().split("&") if "=" in x)
        token = qs.get("token")
        try:
            user_id = AccessToken(token)["user_id"]
            self.user = await database_sync_to_async(get_user_model().objects.get)(id=user_id)
        except Exception:
            await self.close()
            return

        # Default to English
        self.lang = await database_sync_to_async(
            lambda: Language.objects.filter(code="en").first()
        )()
        if not self.lang:
            self.lang = Language(code="en", name="English", tts_code="en-US")

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("WS connect: %s joined class %s", self.user.username, self.class_id)

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")

        if msg_type == "set_language":
            code = content.get("code", "en")
            lang = await database_sync_to_async(Language.objects.filter(code=code).first)()
            if lang:
                self.lang = lang
                await self.send_json({"type": "language_set", "code": code, "name": lang.name})
            else:
                await self.send_json({"type": "error", "message": f"Unknown language: {code}"})

        elif msg_type == "audio":
            if not (hasattr(self, "user") and self.user.role == "teacher"):
                await self.send_json({"type": "error", "message": "Only the teacher can send audio."})
                return
            try:
                pcm = base64.b64decode(content["data"])
                text = await sync_to_async(services.speech_to_text)(pcm)
            except services.GoogleNotConfigured as e:
                await self.send_json({"type": "error", "message": str(e)})
                return
            except Exception as e:
                await self.send_json({"type": "error", "message": f"Speech recognition failed: {e}"})
                return

            if text.strip():
                await self._save_transcript(text)
                await self.channel_layer.group_send(
                    self.group_name,
                    {"type": "speech_event", "text": text},
                )

    async def speech_event(self, event):
        """Called on every group member when teacher broadcasts a caption."""
        original = event["text"]
        payload = {"type": "caption", "original": original}

        try:
            if self.lang.code != "en":
                translated = await sync_to_async(services.translate)(original, target=self.lang.code)
            else:
                translated = original
            payload["text"] = translated

            audio_bytes = await sync_to_async(services.text_to_speech)(translated, self.lang.tts_code)
            payload["audio"] = base64.b64encode(audio_bytes).decode()
        except services.GoogleNotConfigured as e:
            payload["text"] = original
            payload["warning"] = str(e)
        except Exception as e:
            payload["text"] = original
            payload["warning"] = f"Translation/TTS error: {e}"

        await self.send_json(payload)

    @database_sync_to_async
    def _save_transcript(self, text: str):
        en, _ = Language.objects.get_or_create(
            code="en", defaults={"name": "English", "tts_code": "en-US"}
        )
        Transcript.objects.create(
            live_class_id=self.class_id,
            language=en,
            text=text,
            source="stt",
        )
