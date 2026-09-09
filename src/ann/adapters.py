class WhatsAppAdapter:
    """Adapter for WhatsApp text/voice messages."""

    def __init__(self, brain):
        self.brain = brain

    def handle_message(self, message: str):
        return self.brain.process(message, source="whatsapp")

    def handle_voice(self, transcript: str):
        return self.brain.process(transcript, source="voice")


class HostDeviceAdapter:
    """Adapter for device-side supported actions."""

    def __init__(self, brain):
        self.brain = brain

    def dispatch_action(self, action: str):
        return self.brain.process(action, source="host_device")
