# Contributing to SmartCat Feeder (Pet Food Dispenser)

First off, thank you for considering contributing to the **SmartCat Feeder** project! Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [How Can I Contribute?](#-how-can-i-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Pull Request Process](#pull-request-process)
3. [Development Setup](#-development-setup)
4. [Security Guidelines](#-security-guidelines)
5. [Style Guide](#-style-guide)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by the [SmartCat Feeder Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## 🚀 How Can I Contribute?

### Reporting Bugs

Bugs are tracked using GitHub Issues. Before creating a bug report, please check existing issues to avoid duplicates.

When reporting a bug, please include:
- **A clear, descriptive title**
- **Steps to reproduce the issue**
- **Expected vs. actual behavior**
- **Environment details** (e.g., Node version, OS, Arduino R4 WiFi Board Manager version)
- **Relevant console logs or hardware serial output**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub Issues.

When suggesting an enhancement:
- Use a clear title.
- Provide a step-by-step description of the suggested feature.
- Explain why this enhancement would be useful to users or developers.

### Pull Request Process

1. **Fork the Repository**: Create a personal fork of the project on GitHub.
2. **Clone your Fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Pet-Food-Dispenser.git
   cd Pet-Food-Dispenser
   ```
3. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-new-feature
   ```
4. **Commit Your Changes**: Follow clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add real-time food level sensor indicator"
   ```
5. **Ensure Code Quality**:
   - Verify both frontend and backend build cleanly without errors:
     ```bash
     cd backend && npm run build
     cd ../frontend && npm run build
     ```
   - Make sure no hardcoded secrets or API keys are present in any commit.
6. **Push to Your Fork**:
   ```bash
   git push origin feature/amazing-new-feature
   ```
7. **Open a Pull Request**: Submit your PR targeting the `main` branch of the official repository.

---

## 🛠️ Development Setup

The project consists of three main components:

1. **Backend (`/backend`)**: Node.js, Express, TypeScript, Prisma ORM, MQTT.
2. **Frontend (`/frontend`)**: React 18, Vite, TypeScript, TailwindCSS.
3. **Firmware (`/arduino`)**: Arduino C++ for Arduino UNO R4 WiFi (using `WiFiS3`, `PubSubClient`, `Servo`, `ArduinoJson`).

For detailed installation instructions, please refer to the [Main README](README.md).

---

## 🔒 Security Guidelines

> [!IMPORTANT]
> Never commit real Wi-Fi credentials, private keys, JWT secrets, or database URLs to the public repository.

- Always use environment variables (`.env`) for backend secrets.
- Use `arduino_secrets.h` or `arduino/local_config/` (ignored by Git) for local hardware testing.
- If you discover a security vulnerability, please report it privately to the maintainer rather than creating a public issue.

---

## 🎨 Style Guide

- **TypeScript**: Use strict mode and explicit types where applicable.
- **Frontend Components**: Keep components modular and follow TailwindCSS design tokens.
- **Git Commits**: Use semantic commit prefixes (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`).

---

Thank you for contributing! 🐾
