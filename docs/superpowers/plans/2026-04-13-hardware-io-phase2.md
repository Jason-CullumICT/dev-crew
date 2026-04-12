# Phase 2 — Hardware I/O Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the door model into a full device tree. Every door gets attached input devices (card readers, REX, sensors) and output devices (locks, sirens, cameras), each mapped to controller I/O ports. Add Hardware Inventory page, Door Configuration wiring diagram, and device-level events in the simulator.

**Architecture:** ~5,880 devices generated procedurally from existing doors/zones/controllers. Two new pages (Hardware Inventory with virtual scroll, Door Configuration with SVG wiring diagram). Event simulator extended with 6 new device-level event types.

**Tech Stack:** React 19, TypeScript 6 strict, Zustand 5, @tanstack/react-virtual, Tailwind v4, lucide-react

**Tasks:** 8 tasks, parallelizable after Task 3. See full plan in agent output above.

**Files:** 6 new, 11 modified. Types → Seed → Store → then parallel: Hardware page, DoorConfig page, Event simulator, Canvas integration, Tests.
