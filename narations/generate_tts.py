"""
Aphelion Demo — ElevenLabs TTS Generator
=========================================
Run: pip install requests && python generate_tts.py YOUR_API_KEY

Generates narration audio for each section of the demo video.
Output: ./audio/ folder with numbered MP3 files.
"""
import requests, os, sys

if len(sys.argv) < 2:
    print("Usage: python generate_tts.py <ELEVENLABS_API_KEY>")
    sys.exit(1)

API_KEY = sys.argv[1]
VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # Daniel
MODEL = "eleven_multilingual_v2"

segments = {
    "01_problem": "If you've ever traded perpetual futures, you know the problem. You're staring at rows of numbers, juggling tabs, trying to figure out which position is burning your margin and which one's printing. Most dashboards show you data. But data isn't the same as understanding. Aphelion was built because we believe risk should be something you see, instantly, not something you calculate.",
    "02_solution": "Aphelion is a margin intelligence dashboard built directly on Pacifica's infrastructure. It connects to Pacifica's REST API and WebSocket feed to pull live account data, market prices, orderbook depth, and funding rates. No third-party data. No delays. The core idea is simple: your portfolio is visualized as an orbital field, where each position literally orbits your equity center. Distance means leverage. Size means notional value. Color means direction. You get the full picture in half a second.",
    "03_walkthrough_orbital": "Let me show you how it works. When you first open Aphelion, you land on the orbital view. This is your portfolio in spatial form. Each node represents an open position. The closer it orbits to the center, the lower the leverage. Larger nodes mean bigger positions.",
    "04_wallet_connect": "Now let's connect a wallet. Click the connect button. Aphelion supports any Solana wallet. Phantom, Solflare, you name it. Once connected, your live positions load directly from Pacifica.",
    "05_place_trade": "Let's place a trade. I'll switch to the trade panel. Select BTC, set the side to Buy. I'll enter 15 dollars in USD mode. Notice how the system automatically converts that to the right token amount and rounds to Pacifica's lot size. Set leverage to 10x, slippage to half a percent, and hit Buy. The order goes through Pacifica's API with proper wallet signing. You'll see the confirmation appear in the order history.",
    "06_view_modes": "Now let me show you the other views. Timeline mode shows your equity curve over time. Funding view gives you a heatmap of funding rates across all symbols, super useful for spotting which positions are costing you. Depth mode shows the live orderbook. And P-N-L view breaks down your performance by position with win rate analysis.",
    "07_alerts": "You can also see real-time alerts. Aphelion automatically flags high leverage, margin utilization warnings, and funding rate anomalies. Each alert is actionable. You can adjust your position right from the alert.",
    "08_pacifica": "Let me be clear about how Pacifica powers this. Every piece of data comes from Pacifica's endpoints. Account balances, positions, and margin data come from the REST API. Market prices and orderbook updates stream through the WebSocket at w-s dot pacifica dot f-i, with a 30-second heartbeat and automatic reconnection. Order execution, both market and limit, goes through Pacifica's order creation endpoints with full Solana wallet message signing. We handle lot size rounding, slippage control, take profit, stop loss, reduce-only orders, all through Pacifica's native protocol.",
    "09_value": "Why would someone use this? Because it's faster. You open Aphelion, glance at the orbital view, and immediately know which positions need attention without reading a single number. The one-click execution means you can react in seconds. It's designed for active traders running multiple leveraged positions who need spatial awareness of their risk, not another spreadsheet.",
    "10_whats_next": "If we had more time, we'd add P-N-L analytics with historical drawdown tracking, multi-account support for separate strategies, push notifications for liquidation proximity, and a dedicated mobile experience. We're committed to building on Pacifica long-term. Thanks for watching.",
}

os.makedirs("audio", exist_ok=True)

for name, text in segments.items():
    print(f"Generating: {name}...", end=" ", flush=True)
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128",
        headers={"xi-api-key": API_KEY, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": MODEL,
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": True, "speed": 0.95},
        },
    )
    if resp.status_code != 200:
        print(f"ERROR {resp.status_code}: {resp.text[:100]}")
        continue
    path = f"audio/{name}.mp3"
    with open(path, "wb") as f:
        f.write(resp.content)
    print(f"OK ({len(resp.content)//1024} KB)")

print("\nDone! Audio files saved to ./audio/")
print("Combine with your screen recording using any video editor.")
