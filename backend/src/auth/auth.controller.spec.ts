
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Logger } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { AppModule } from "../app.module";

jest.setTimeout(30000);
describe("Auth endpoints", () => {
  const logger = new Logger("AuthControllerSpec");
  let app: INestApplication;
  let cookie: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { if (app) { try { await app.close(); } catch(e) { logger.error(e instanceof Error ? e.stack : String(e)); } } }, 20000);

  it("login valide cookie HttpOnly sans token body", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ phone: "+2250699000001", password: "TestPass123" });
    expect([200, 201]).toContain(res.status);
    expect(res.body.user).toBeDefined();
    expect(res.body.accessToken).toBeUndefined();
    const cookies = res.headers["set-cookie"] as unknown as string[];
    const ac = cookies?.find(c => c.startsWith("access_token="));
    expect(ac).toContain("HttpOnly");
    expect(ac).toContain("SameSite");
    cookie = ac?.split(";")[0] || "";
  });

  it("login mauvais password retourne 401", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ phone: "+2250699000001", password: "faux" })
      .expect(401);
  });

  it("login champ manquant retourne 400", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ phone: "+2250699000001" })
      .expect(400);
  });

  it("GET /auth/me sans cookie retourne 401", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
  });

  it("GET /auth/me avec cookie retourne user", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/me").set("Cookie", cookie).expect(200);
    expect(res.body.user.phone).toBe("+2250699000001");
  });

  it("logout retourne success", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie || "")
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
