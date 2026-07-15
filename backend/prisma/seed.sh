#!/bin/bash
# JENEUS HelpDesk — Seed Script
# Run this to populate the database with demo data.
# Requires DATABASE_URL to be set in .env or environment.
npx tsx prisma/seed.ts
