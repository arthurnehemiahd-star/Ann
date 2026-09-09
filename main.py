from src.ann.brain import AnnBrain
from src.ann.database import Database
from src.ann.adapters import HostDeviceAdapter, WhatsAppAdapter
from src.ann.config import config


def main():
    database = Database(config.db_path)
    brain = AnnBrain(db=database)
    whatsapp = WhatsAppAdapter(brain)
    host = HostDeviceAdapter(brain)

    print(f"{config.app_name} is running...")

    sample_messages = [
        "Hello ANN",
        "What time is it?",
        "Remember I like chess",
        "What do you remember?",
        "Start a game",
    ]

    for message in sample_messages:
        print(f"You: {message}")
        print(f"ANN: {whatsapp.handle_message(message)}")
        print("-")

    print(f"Host action: {host.dispatch_action('Open the settings panel')}")


if __name__ == "__main__":
    main()
