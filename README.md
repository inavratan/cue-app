# Cue AI Stadium Companion
> **Cue** — *From Queue to Cue.* Stadiums are defined by frustrating queues. We flip the script by giving you a **Cue**: an intelligent, real-time signal telling you exactly when and where to move.

- Version: 2.0.0
- Performance: gzip, sync-stable, multi-worker

## Architecture
```text
[Frontend: Vanilla JS + CSS PWA]
          │
      REST API (Flask)
          │
  ┌───────┼─────────────────┐
  │       │                 │
[Memory] [Gemini]       [Cloudinary]
Cache   Concierge      Image Delivery
```

## License
MIT License
