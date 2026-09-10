import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { fishingSettings } from "../../../db/schema";

const defaults = { region: "서해", preferredTides: "3,4,5,10,11" };
const regions = new Set(["서해", "남해", "동해", "제주"]);

function parseTides(input: string) {
  const values: number[] = [];
  const normalized = input.replace(/[–—〜～]/g, "~");
  for (const match of normalized.matchAll(/(\d+)\s*(?:~|-)\s*(\d+)|(\d+)/g)) {
    if (match[1] && match[2]) {
      const start = Number(match[1]);
      const end = Number(match[2]);
      for (let tide = Math.min(start, end); tide <= Math.max(start, end); tide++) values.push(tide);
    } else if (match[3]) values.push(Number(match[3]));
  }
  return [...new Set(values.filter((tide) => tide >= 1 && tide <= 15))].sort((a, b) => a - b);
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const [settings] = await getDb().select().from(fishingSettings).where(eq(fishingSettings.ownerEmail, user.email)).limit(1);
  if (settings?.preferredTides === "1,5") {
    const preferredTides = "1,2,3,4,5";
    await getDb().update(fishingSettings).set({ preferredTides, updatedAt: new Date().toISOString() }).where(eq(fishingSettings.ownerEmail, user.email));
    return Response.json({ settings: { ...settings, preferredTides } });
  }
  return Response.json({ settings: settings ?? defaults });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json() as { region?: string; preferredTides?: string };
  const region = regions.has(body.region || "") ? body.region! : defaults.region;
  const tides = parseTides(String(body.preferredTides || ""));
  const preferredTides = [...new Set(tides)].join(",");
  if (!preferredTides) return Response.json({ error: "1~15 사이의 물때 숫자를 입력해주세요." }, { status: 400 });
  const [settings] = await getDb().insert(fishingSettings).values({ ownerEmail: user.email, region, preferredTides })
    .onConflictDoUpdate({ target: fishingSettings.ownerEmail, set: { region, preferredTides, updatedAt: new Date().toISOString() } }).returning();
  return Response.json({ settings });
}
