# 🕵️‍♂️ Missão: Impossível — O Acerto Final (Sudoku Battle Royale)

> **Atividade Avaliativa I — IA Responsável** > Faculdade Senac DF

![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WebSockets](https://img.shields.io/badge/WebSockets-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

## 📌 Sobre o Projeto

A Inteligência Artificial previu todos os movimentos. O tabuleiro é um sistema fechado de lógica. **A sua missão é encontrar o espaço vazio que o algoritmo não previu.**

Este projeto é uma aplicação web em tempo real (Real-Time) que recria o clássico jogo de Sudoku com uma temática de *Missão: Impossível*, introduzindo um modo **Battle Royale Síncrono** via WebSockets. Os agentes (jogadores) competem na mesma sala para decifrar a matriz antes que o sistema entre em colapso.

## 🚀 Funcionalidades (Features)

- **🕹️ Operação Solo:** Jogue offline nas dificuldades Fácil, Médio ou Difícil.
- **⚔️ Protocolo Fantasma (Multiplayer):** Crie salas e conecte múltiplos jogadores na mesma matriz via PIN ou leitura de QR Code.
- **💀 Morte Súbita:** Cometa 3 erros lógicos e seja sumariamente eliminado (desconectado) do servidor.
- **🧠 Sistema BENJI:** Modo de anotações (Notes) para mapear hipóteses táticas nas células.
- **📡 Sincronização Global:** Comunicação bidirecional em tempo real informando quando agentes entram na sala, são eliminados ou quebram o código.

## 🛠️ Tecnologias Utilizadas

- **Back-end:** Laravel 11 (PHP 8.2+)
- **Front-end:** HTML5, Vanilla JavaScript, CSS3 (Custom Properties & Grid)
- **Comunicação Real-Time:** Laravel WebSockets (Reverb / Pusher) e Laravel Echo.
- **Infraestrutura:** Hospedagem com Apache (`.htaccess` tunning)

## 👥 Equipe de Desenvolvimento

Projeto arquitetado e desenvolvido por:
* **Fernando Aguiar da Costa Morais**
* **Claudia Marques da Silva**
* **Marília Mesquita Pereira do Amaral**

---
*Este sistema vai se autodestruir em 5 segundos.*
