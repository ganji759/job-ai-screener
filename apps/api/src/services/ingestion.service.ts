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
  const fullName = row['Full Name'] ?? row['full_name'] ?? row['Name'] ?? row['name'] ?? '';
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] ?? 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || 'Unknown';

  const email =
    row['Email'] ?? row['email'] ?? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@unknown.com`;

  const headline =
    row['Headline'] ?? row['headline'] ?? row['Role'] ?? row['Title'] ?? row['title'] ?? 'Professional';

  const location = row['Location'] ?? row['location'] ?? row['City'] ?? 'Unknown';

  const bio = (row['Bio'] ?? row['bio'] ?? row['Summary'] ?? row['summary'] ?? '').slice(0, 500) || undefined;

  const skillsRaw = row['Skills'] ?? row['skills'] ?? row['Technical Skills'] ?? '';
  const skills: ParsedProfile['skills'] = skillsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, level: 'Intermediate' as const, yearsOfExperience: 0 }));

  const expRaw =
    row['Years of Experience'] ??
    row['years_of_experience'] ??
    row['Experience Years'] ??
    row['experience_years'] ??
    '0';
  const experienceYears = parseInt(expRaw, 10) || 0;

  const educationRaw = row['Education'] ?? row['education'] ?? row['Degree'] ?? row['degree'] ?? '';
  const education: ParsedProfile['education'] = educationRaw
    ? [
        {
          institution: educationRaw,
          degree: 'Unknown',
          fieldOfStudy: 'Unknown',
          startYear: 0,
          endYear: 0,
        },
      ]
    : [];

  const experience: ParsedProfile['experience'] =
    experienceYears > 0
      ? [
          {
            company: row['Company'] ?? row['company'] ?? 'Previous Employer',
            role: headline,
            startDate: `${new Date().getFullYear() - experienceYears}-01`,
            endDate: 'Present',
            description: bio ?? '',
            technologies: skills.map((s) => s.name),
            isCurrent: true,
          },
        ]
      : [];

  if (firstName === 'Unknown' && skills.length === 0) {
    return null;
  }

  return {
    firstName,
    lastName,
    email,
    headline,
    bio,
    location,
    skills,
    experience,
    education,
    projects: [],
    availability: {
      status: 'Available',
      type: (row['Availability Type'] ?? row['availability_type'] ?? 'Full-time') as ParsedProfile['availability']['type'],
    },
  };
}
