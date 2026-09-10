import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { fishingSettings } from "../../../db/schema";

const defaults = { region: "서해", preferredTides: "3,4,5,10,11" };
const regions = new Set(["서해", "남해", "동해", "제주"]);

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const [settings] = await getDb().select().from(fishingSettings).where(eq(fishingSettings.ownerEmail, user.email)).limit(1);
  return Response.json({ settings: settings ?? defaults });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json() as { region?: string; preferredTides?: string };
  const region = regions.has(body.region || "") ? body.region! : defaults.region;
  const tides = String(body.preferredTides || "").split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 15);
  const preferredTides = [...new Set(tides)].join(",");
  if (!preferredTides) return Response.json({ error: "1~15 사이의 물때 숫자를 입력해주세요." }, { status: 400 });
  const [settings] = await getDb().insert(fishingSettings).values({ ownerEmail: user.email, region, preferredTides })
    .onConflictDoUpdate({ target: fishingSettings.ownerEmail, set: { region, preferredTides, updatedAt: new Date().toISOString() } }).returning();
  return Response.json({ settings });
}
