# 🌿 KODAMA AI — Your Professional Synthesis Partner

Kodama is a premium, high-performance desktop AI assistant designed for deep research, technical synthesis, and professional documentation. Built with a sleek, low-contrast **"IPS Obsidian"** aesthetic, Kodama provides a distraction-free environment for complex tasks.

---

## ✨ Key Features

- **🧠 Neural Chat**: High-speed technical assistance powered by any local LLM via Ollama.
- **🌐 Autonomous Search**: A specialized agent scours the internet to augment the AI's knowledge with live, real-time data.
- **📄 Executive PDF Synthesis**: Instantly compile deep-research into professional, branded whitepapers using the advanced **ReportLab** engine.
- **🎨 Dynamic Branding**: Every generated report is unique, randomly featuring one of 6 premium "Executive Palettes" (Indigo, Emerald, Ember, etc.).
- **🌍 Universal Model Support**: Built-in JSON-repair and resilient fallback logic ensures stable performance across any model size (from 1B to 70B parameters).
- **🎨 Premium UI**: Optimized for long sessions with "IPS Obsidian" (Dark) and "Premium Paper" (Light) themes to reduce eye strain.
- **🔒 Local First**: Privacy by design. All neural processing happens on your own hardware via Ollama.

---

## 🛠️ Tech Stack

- **Frontend**: Electron, Vanilla JS, Tailwind CSS (High-Speed Rendering).
- **Engine**: Python 3.10+ (Data Pipeline).
- **Synthesis**: **ReportLab** (Industrial-Grade PDF Engine), **duckduckgo-search** (Web Intelligence).
- **Models**: Compatible with all Ollama-supported models (Llama 3, Qwen 2.5, Phi 3, etc.).

---

## 🚀 Getting Started

### Prerequisites

1. **Ollama**: Download and install [Ollama](https://ollama.com/).
2. **Models**: Kodama is optimized for any model. We recommend:
   ```bash
   ollama pull qwen2.5-coder:7b
   ```
3. **Node.js**: Install Node.js (V20+ recommended).

### Installation

1. **Clone & Setup**:
   ```bash
   cd kodama-ai
   npm install
   ```
2. **Python Environment**:
   ```bash
   python -m venv llm-env
   llm-env\Scripts\activate
   pip install -r requirements.txt
   ```

### Running the App

```bash
npm start
```

---

## ⌨️ Specialized Commands

Enhance your workflow with direct synthesis commands:
- `make pdf: [topic]` — Triggers the Autonomous Research agent to generate a multi-chapter, professional PDF report with dynamic branding.
- `search for: [query]` — Forces the Chat agent to ignore internal knowledge and use live web data for the response.

---

## 📜 License
MIT License — Created with ❤️ by **EncodeX**
