import Papa from 'papaparse';
import { normalisePdf } from './ai.client.js';
import type { ParsedProfile } from '@umurava/db';
import { AppError } from '../lib/errors.js';

export async function parsePDF(buffer: Buffer, filename: string): Promise<ParsedProfile> {
  // Delegate to Python AI service — pdfplumber handles multi-column resumes
  return (await normalisePdf(buffer, filename)) as ParsedProfile;
}

export async function parseCSV(buffer: Buffer): Promise<ParsedProfile[]> {
  const text = buffer.toString('utf-8');
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    throw new AppError('CSV_PARSE_ERROR', errors[0]?.message || 'Failed to parse CSV');
  }

  return data.map(mapRowToProfile).filter((p): p is ParsedProfile => p !== null);
}

function mapRowToProfile(row: Record<string, string>): ParsedProfile | null {
  // Try common column name variations
  const name = row['Full Name'] ?? row['full_name'] ?? row['Name'] ?? row['name'] ?? 'Unknown';
  const skillsRaw = row['Skills'] ?? row['skills'] ?? row['Technical Skills'] ?? '';
  const expRaw =
    row['Years of Experience'] ??
    row['years_of_experience'] ??
    row['Experience'] ??
    row['experience'] ??
    '0';
  const education =
    row['Education'] ?? row['education'] ?? row['Degree'] ?? row['degree'] ?? '';
  const summary =
    row['Summary'] ?? row['summary'] ?? row['Bio'] ?? row['bio'] ?? '';

  const skills = skillsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const experience_years = parseInt(expRaw, 10);

  // Skip rows with no meaningful data
  if (name === 'Unknown' && skills.length === 0) {
    return null;
  }

  return {
    name,
    skills,
    experience_years: isNaN(experience_years) ? 0 : experience_years,
    education,
    summary: summary.slice(0, 500),
  };
}
