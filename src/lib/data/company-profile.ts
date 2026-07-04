import { delay } from "@/lib/data/_delay";
import { companyProfileFixture } from "@/lib/fixtures/company-profile";
import { companyProfileSchema, type CompanyProfile } from "@/lib/schemas/company-profile";

export async function getCompanyProfile(): Promise<CompanyProfile> {
  await delay();
  return companyProfileSchema.parse(companyProfileFixture.current);
}

export async function updateCompanyProfile(input: CompanyProfile): Promise<CompanyProfile> {
  await delay(400);
  const parsed = companyProfileSchema.parse(input);
  companyProfileFixture.current = parsed;
  return parsed;
}
