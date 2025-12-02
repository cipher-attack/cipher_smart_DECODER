<div align="center">
  <img src="https://via.placeholder.com/150/000000/00ff41?text=CIPHER" alt="CIPHER Logo" width="120" height="120" style="border-radius: 20px" />
  
  # CIPHER
  
  **Advanced Forensic Analysis & Data Recovery Tool**
  
  _Built by Biruk Getachew_
</div>

---

## What is this?

I built CIPHER because I needed a reliable way to analyze locked configuration files (like `.ehi`, `.hc`, `.v2ray`) directly in the browser without relying on shady mobile apps. 

It started as a simple Hex Viewer but I've expanded it into a full forensic suite. It can dig through binary data to find hidden IPs, SNI hosts, and V2Ray configs. It works in **Hybrid Mode** — meaning it uses a local JavaScript engine for offline analysis, and connects to AI for deep decryption when an API key is provided.

## Key Features

*   **🕵️‍♂️ Deep Packet Inspection:** Extracts hidden Strings, IPs, and Credentials from binary blobs.
*   **🧠 Hybrid Intelligence:** Works 100% offline (Local Engine) or online (Cloud AI) for complex recovery.
*   **💉 Payload Generator:** Auto-generates working HTTP injection scripts based on a bug host.
*   **📡 Dead Drop:** Share sensitive configs via QR Code (Air-gapped) without internet.
*   **🎨 Cyber UI:** Fully immersive 3D interface with particle networks and sound effects.

## Tech Stack

*   **Core:** React + TypeScript
*   **Styling:** Tailwind CSS (Custom "Hacker" Theme)
*   **AI:** Gemini API (Optional)
*   **Visuals:** HTML5 Canvas & CSS 3D Transforms

## How to Run

1.  Clone this repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the local server:
    ```bash
    npm start
    ```

## Author

**Biruk Getachew**  
*Web Developer & Security Researcher*

> "Decryption is just advanced reading."

---
© 2024 CIPHER. All rights reserved.
