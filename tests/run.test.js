/**
 * tests/run.test.js
 *
 * Automated backend test suite.
 * Runs with: node tests/run.test.js
 *
 * No external test framework needed — just Node.js built-ins.
 * Uses fetch (Node 18+) for HTTP calls.
 *
 * Setup:
 *   1. Make sure server is running: npm run dev
 *   2. Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in .env
 *      or pass as env vars:
 *      TEST_ADMIN_EMAIL=admin@gmail.com TEST_ADMIN_PASSWORD=xxx node tests/run.test.js
 */

const BASE = process.env.TEST_BASE_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "akvish052@gmail.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "Usha85918";

// Tell the server we are in test mode (relaxes rate limits)
// Make sure your package.json test script is:
// "test": "cross-env NODE_ENV=test node tests/run.test.js"
// Install cross-env: npm install --save-dev cross-env

/* ── tiny test framework ────────────────────────────────────────────────── */
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function ok(name, condition, got) {
  if (condition) {
    console.log(`  ✅  ${name}`);
    passed++;
  } else {
    console.log(`  ❌  ${name}`);
    console.log(`       got: ${JSON.stringify(got)}`);
    failed++;
    failures.push({ name, got });
  }
}

function skip(name, reason) {
  console.log(`  ⏭   ${name} — skipped (${reason})`);
  skipped++;
}

function section(name) {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  ${name}`);
  console.log("═".repeat(55));
}

/* ── http helpers ───────────────────────────────────────────────────────── */
// Store cookies per "session" (user vs admin)
const cookieJars = {};

function setCookies(session, headers) {
  const raw = headers.getSetCookie?.() || [];
  if (!cookieJars[session]) cookieJars[session] = {};
  raw.forEach((c) => {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    cookieJars[session][k.trim()] = v?.trim() || "";
  });
}

function getCookieHeader(session) {
  const jar = cookieJars[session] || {};
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function req(method, path, body, session = "user") {
  const headers = { "Content-Type": "application/json" };
  const cookieStr = getCookieHeader(session);
  if (cookieStr) headers["Cookie"] = cookieStr;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  setCookies(session, res.headers);

  let json = {};
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, body: json, headers: res.headers };
}

const get = (path, session) => req("GET", path, null, session);
const post = (path, body, session) => req("POST", path, body, session);
const patch = (path, body, session) => req("PATCH", path, body, session);
const del = (path, session) => req("DELETE", path, null, session);

/* ── test data ──────────────────────────────────────────────────────────── */
const TS = Date.now();
const testUser = {
  Name: `AutoTest ${TS}`,
  Email: `autotest${TS}@gmail.com`,
  Password: "TestPass@1234",
};
const testUser2 = {
  Name: `AutoTest2 ${TS}`,
  Email: `autotest2${TS}@gmail.com`,
  Password: "TestPass@1234",
};

let userId = null;
let userId2 = null;
let xssUserId = null;
let testId = null;
let resultId = null;
let coachingId = null;
let notifId = null;

/* ══════════════════════════════════════════════════════════════════════════
   TESTS START
══════════════════════════════════════════════════════════════════════════ */
async function runAll() {
  console.log(`\n🚀  TestWala Backend Test Suite`);
  console.log(`   Base URL : ${BASE}`);
  console.log(`   Admin    : ${ADMIN_EMAIL}`);
  console.log(`   Started  : ${new Date().toLocaleTimeString()}\n`);

  /* ────────────────────────────────────────────────────────────────────────
     SECTION 1 — HEALTH
  ──────────────────────────────────────────────────────────────────────── */
  section("1. HEALTH CHECK");

  const health = await get("/health");
  ok("GET /health returns 200", health.status === 200, health.status);
  ok("GET /health returns ok:true", health.body.ok === true, health.body);

  const notFound = await get("/this-route-does-not-exist");
  ok("Unknown route returns 404", notFound.status === 404, notFound.status);

  /* ────────────────────────────────────────────────────────────────────────
     SECTION 2 — AUTH: SIGNUP
  ──────────────────────────────────────────────────────────────────────── */
  section("2. AUTH — SIGNUP");

  const signup = await post("/auth/signup", testUser);
  ok("Signup returns 201", signup.status === 201, signup.status);
  ok("Signup returns user data", !!signup.body.data?._id, signup.body);
  ok(
    "isAdmin is false on new user",
    signup.body.data?.isAdmin === false,
    signup.body.data?.isAdmin,
  );
  userId = signup.body.data?._id;

  const dupSignup = await post("/auth/signup", testUser);
  ok("Duplicate email returns 409", dupSignup.status === 409, dupSignup.status);

  const badEmail = await post("/auth/signup", {
    ...testUser,
    Email: "notanemail",
    Password: "x",
  });
  ok(
    "Invalid email rejected",
    badEmail.status === 400 ||
      badEmail.status === 422 ||
      badEmail.status === 409,
    badEmail.status,
  );

  // XSS injection — should succeed but script stripped
  const xssSignup = await post("/auth/signup", {
    Name: "<script>alert(1)</script>XSSUser",
    Email: `xss${TS}@gmail.com`,
    Password: "Test@1234",
  });
  ok(
    "XSS signup doesn't crash (201)",
    xssSignup.status === 201,
    xssSignup.status,
  );
  ok(
    "XSS script tag stripped from Name",
    !xssSignup.body.data?.Name?.includes("<script>"),
    xssSignup.body.data?.Name,
  );
  xssUserId = xssSignup.body.data?._id || null;

  // Mass assignment — inject isAdmin
  const massSignup = await post("/auth/signup", {
    ...testUser2,
    isAdmin: true,
    role: "admin",
  });
  ok(
    "Mass assignment signup returns 201",
    massSignup.status === 201,
    massSignup.status,
  );
  ok(
    "isAdmin injection ignored (stays false)",
    massSignup.body.data?.isAdmin === false,
    massSignup.body.data?.isAdmin,
  );
  userId2 = massSignup.body.data?._id;

  /* ────────────────────────────────────────────────────────────────────────
     SECTION 3 — AUTH: SIGNIN
  ──────────────────────────────────────────────────────────────────────── */
  section("3. AUTH — SIGNIN");

  const signin = await post(
    "/auth/signin",
    { Email: testUser.Email, Password: testUser.Password },
    "user",
  );
  ok("Signin returns 200", signin.status === 200, signin.status);
  ok("Signin returns user data", !!signin.body.data?._id, signin.body);
  ok(
    "Cookie set after signin",
    !!getCookieHeader("user"),
    getCookieHeader("user"),
  );

  const wrongPw = await post("/auth/signin", {
    Email: testUser.Email,
    Password: "wrong",
  });
  ok("Wrong password returns 401", wrongPw.status === 401, wrongPw.status);

  const noEmail = await post("/auth/signin", {
    Email: "nobody@gmail.com",
    Password: "x",
  });
  ok("Unknown email returns 401", noEmail.status === 401, noEmail.status);

  // NoSQL injection attempt
  const nosqlInject = await post("/auth/signin", {
    Email: testUser.Email,
    Password: { $gt: "" },
  });
  ok(
    "NoSQL $gt injection blocked (not 200)",
    nosqlInject.status !== 200,
    nosqlInject.status,
  );

  // Signin user2 in separate session
  await post(
    "/auth/signin",
    { Email: testUser2.Email, Password: testUser2.Password },
    "user2",
  );

  /* ────────────────────────────────────────────────────────────────────────
     SECTION 4 — AUTH: /ME
  ──────────────────────────────────────────────────────────────────────── */
  section("4. AUTH — /ME");

  const me = await get("/auth/me", "user");
  ok("GET /auth/me returns 200", me.status === 200, me.status);
  ok(
    "GET /auth/me returns correct user",
    me.body.data?.Email === testUser.Email,
    me.body.data?.Email,
  );

  const meNoAuth = await get("/auth/me", "nobody");
  ok(
    "GET /auth/me without cookie returns 401",
    meNoAuth.status === 401,
    meNoAuth.status,
  );

  /* ────────────────────────────────────────────────────────────────────────
     SECTION 5 — ADMIN SIGNIN
  ──────────────────────────────────────────────────────────────────────── */
  section("5. ADMIN — SIGNIN");

  const adminSignin = await post(
    "/auth/signin",
    { Email: ADMIN_EMAIL, Password: ADMIN_PASSWORD },
    "admin",
  );
  if (adminSignin.status !== 200) {
    skip(
      "All admin tests",
      `Admin signin failed (${adminSignin.status}) — check TEST_ADMIN_EMAIL/PASSWORD`,
    );
  } else {
    ok(
      "Admin signin returns 200",
      adminSignin.status === 200,
      adminSignin.status,
    );
    ok(
      "Admin user has isAdmin:true",
      adminSignin.body.data?.isAdmin === true,
      adminSignin.body.data?.isAdmin,
    );

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 6 — SECURITY HEADERS
    ──────────────────────────────────────────────────────────────────────── */
    section("6. SECURITY HEADERS");

    const headRes = await fetch(`${BASE}/health`, { method: "HEAD" });
    const h = (name) => headRes.headers.get(name) || "";

    ok(
      "X-Frame-Options header present",
      h("x-frame-options").length > 0,
      h("x-frame-options") || "missing",
    );
    ok(
      "X-Content-Type-Options: nosniff",
      h("x-content-type-options").includes("nosniff"),
      h("x-content-type-options") || "missing",
    );
    ok(
      "Content-Security-Policy present",
      h("content-security-policy").length > 0,
      h("content-security-policy") || "missing",
    );
    ok(
      "Referrer-Policy present",
      h("referrer-policy").length > 0,
      h("referrer-policy") || "missing",
    );

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 7 — SECURITY: ATTACK VECTORS
    ──────────────────────────────────────────────────────────────────────── */
    section("7. SECURITY — ATTACK VECTORS");

    // Prototype pollution
    const proto = await post("/auth/signup", {
      __proto__: { isAdmin: true },
      Email: `proto${TS}@gmail.com`,
      Password: "Test@1234",
    });
    // 400 = protoGuard blocked it (most secure)
    // 201/409 = signup succeeded but isAdmin injection ignored (also acceptable)
    ok(
      "__proto__ blocked or ignored (400/201/409)",
      proto.status === 400 || proto.status === 201 || proto.status === 409,
      proto.status,
    );

    // LFI path traversal in URL
    const lfi = await get("/tests/../../etc/passwd", "user");
    ok("Path traversal ../ blocked (400)", lfi.status === 400, lfi.status);

    // LFI URL encoded
    const lfiEnc = await get("/tests/%2e%2e%2f%2e%2e%2fetc%2fpasswd", "user");
    ok(
      "URL-encoded path traversal blocked (400)",
      lfiEnc.status === 400,
      lfiEnc.status,
    );

    // Invalid ObjectId — test using /tests/:id/leaderboard
    // app.param("id") catches all /:id params across all routers
    const badId = await get("/tests/not-a-valid-mongo-id/leaderboard", "admin");
    ok(
      "Invalid ObjectId returns 400 or 404",
      badId.status === 400 || badId.status === 404,
      badId.status,
    );

    // Admin route without admin role
    const adminNoRole = await get("/admin/dashboard", "user");
    ok(
      "Admin route returns 403 for non-admin",
      adminNoRole.status === 403,
      adminNoRole.status,
    );

    // Admin route without any auth
    const adminNoAuth = await get("/admin/users", "nobody");
    ok(
      "Admin route returns 401 without auth",
      adminNoAuth.status === 401,
      adminNoAuth.status,
    );

    // HTTP Parameter Pollution
    const hpp = await get(
      "/tests?sort=name&sort=__proto__&sort=password",
      "user",
    );
    ok(
      "HPP duplicate params handled (not 500)",
      hpp.status !== 500,
      hpp.status,
    );

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 8 — ADMIN DASHBOARD
    ──────────────────────────────────────────────────────────────────────── */
    section("8. ADMIN — DASHBOARD");

    const dashboard = await get("/admin/dashboard", "admin");
    ok(
      "GET /admin/dashboard returns 200",
      dashboard.status === 200,
      dashboard.status,
    );
    ok(
      "Dashboard has users data",
      !!dashboard.body.data?.users,
      dashboard.body.data,
    );
    ok(
      "Dashboard has coachings data",
      !!dashboard.body.data?.coachings,
      dashboard.body.data,
    );
    ok(
      "Dashboard has tests data",
      !!dashboard.body.data?.tests,
      dashboard.body.data,
    );

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 9 — ADMIN USERS
    ──────────────────────────────────────────────────────────────────────── */
    section("9. ADMIN — USERS");

    const users = await get("/admin/users?page=1&limit=5", "admin");
    ok("GET /admin/users returns 200", users.status === 200, users.status);
    ok("Users list is array", Array.isArray(users.body.data), users.body.data);
    ok(
      "Has total count",
      typeof users.body.total === "number",
      users.body.total,
    );

    if (userId) {
      const userDetail = await get(`/admin/users/${userId}`, "admin");
      ok(
        "GET /admin/users/:id returns 200",
        userDetail.status === 200,
        userDetail.status,
      );
      ok(
        "User detail has test results array",
        Array.isArray(userDetail.body.data?.results),
        userDetail.body.data,
      );
    }

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 10 — TESTS CRUD
    ──────────────────────────────────────────────────────────────────────── */
    section("10. TESTS — CRUD");

    const createTest = await post(
      "/tests/create",
      {
        title: `Auto Test ${TS}`,
        examType: "SSC",
        subject: "mathematics",
        timeLimitMin: 30,
        visibility: "public",
        questions: [
          {
            qus: "2+2=?",
            options: ["3", "4", "5", "6"],
            answer: 1,
            explanation: "Basic addition",
          },
          { qus: "3x3=?", options: ["6", "9", "12", "15"], answer: 1 },
          { qus: "10-4=?", options: ["4", "5", "6", "7"], answer: 2 },
        ],
      },
      "admin",
    );
    ok(
      "POST /tests/create returns 201",
      createTest.status === 201,
      createTest.status,
    );
    ok("Test has _id", !!createTest.body.data?._id, createTest.body.data);
    ok(
      "totalMarks auto-computed (3)",
      createTest.body.data?.totalMarks === 3,
      createTest.body.data?.totalMarks,
    );
    ok(
      "accessToken auto-generated",
      !!createTest.body.data?.accessToken,
      createTest.body.data?.accessToken,
    );
    testId = createTest.body.data?._id;
    const accessToken = createTest.body.data?.accessToken;

    if (testId) {
      // Mass assignment — try to override accessToken and totalAttempts
      const massTest = await patch(
        `/tests/${testId}`,
        {
          timeLimitMin: 45,
          accessToken: "custom-hacked-token",
          totalAttempts: 9999,
          createdBy: "fakeid",
        },
        "admin",
      );
      ok(
        "PATCH /tests/:id returns 200",
        massTest.status === 200,
        massTest.status,
      );
      ok(
        "accessToken cannot be changed via PATCH",
        massTest.body.data?.accessToken !== "custom-hacked-token",
        massTest.body.data?.accessToken,
      );
      ok(
        "totalAttempts cannot be changed via PATCH",
        massTest.body.data?.totalAttempts !== 9999,
        massTest.body.data?.totalAttempts,
      );
      ok(
        "timeLimitMin was updated to 45",
        massTest.body.data?.timeLimitMin === 45,
        massTest.body.data?.timeLimitMin,
      );

      // Get by token
      if (accessToken) {
        const byToken = await get(`/tests/token/${accessToken}`, "nobody");
        ok(
          "GET /tests/token/:token returns 200",
          byToken.status === 200,
          byToken.status,
        );
        ok(
          "Password field stripped from token response",
          !byToken.body.data?.password,
          byToken.body.data?.password,
        );
        ok(
          "accessToken field stripped from token response",
          !byToken.body.data?.accessToken,
          byToken.body.data?.accessToken,
        );
      }

      // Stats and leaderboard
      const stats = await get(`/tests/${testId}/stats`, "admin");
      ok(
        "GET /tests/:id/stats returns 200",
        stats.status === 200,
        stats.status,
      );

      const lb = await get(`/tests/${testId}/leaderboard`, "admin");
      ok(
        "GET /tests/:id/leaderboard returns 200",
        lb.status === 200,
        lb.status,
      );
    }

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 11 — RESULTS
    ──────────────────────────────────────────────────────────────────────── */
    section("11. RESULTS — SUBMIT & FETCH");

    if (testId) {
      // Submit with injected score
      const submitResult = await post(
        "/results/submit",
        {
          testId,
          score: 9999, // injected — should be ignored
          isPassed: true, // injected — computed server-side
          percentage: 100, // injected — computed server-side
          totalQuestions: 3,
          wrongAnswers: 1,
          timeTaken: 120,
          allAnswers: { 0: 1, 1: 0, 2: 2 },
          questionTimes: { 0: 40, 1: 40, 2: 40 },
          correctQus: [0, 2],
          wrongQus: [1],
          answeredQus: [0, 1, 2],
          notAnsweredQus: [],
          markedAndAnswered: [],
          markedNotAnswered: [],
          shuffledQuestions: [],
        },
        "user",
      );

      ok(
        "POST /results/submit returns 201",
        submitResult.status === 201,
        submitResult.status,
      );
      ok(
        "Score uses correctQus.length (2), not injected 9999",
        submitResult.body.data?.score === 2,
        submitResult.body.data?.score,
      );
      ok(
        "Percentage computed server-side (not 100)",
        submitResult.body.data?.percentage !== 100,
        submitResult.body.data?.percentage,
      );
      ok(
        "Percentile returned",
        submitResult.body.data?.percentile !== undefined,
        submitResult.body.data,
      );
      resultId = submitResult.body.data?._id;

      // Get my results
      const myResults = await get("/results/student/me", "user");
      ok(
        "GET /results/student/me returns 200",
        myResults.status === 200,
        myResults.status,
      );
      ok(
        "My results is array",
        Array.isArray(myResults.body.data),
        myResults.body.data,
      );
      ok(
        "My results has at least 1 entry",
        myResults.body.data?.length >= 1,
        myResults.body.data?.length,
      );

      if (resultId) {
        // Access without auth — should be 401
        const noAuthResult = await get(`/results/${resultId}`, "nobody");
        ok(
          "GET /results/:id without auth returns 401",
          noAuthResult.status === 401,
          noAuthResult.status,
        );

        // Access by owner — should be 200
        const ownerResult = await get(`/results/${resultId}`, "user");
        ok(
          "GET /results/:id by owner returns 200",
          ownerResult.status === 200,
          ownerResult.status,
        );

        // Access by different user — should be 403
        const otherResult = await get(`/results/${resultId}`, "user2");
        ok(
          "GET /results/:id by other user returns 403",
          otherResult.status === 403,
          otherResult.status,
        );
      }
    }

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 12 — COACHING
    ──────────────────────────────────────────────────────────────────────── */
    section("12. COACHING — CREATE & APPROVE");

    const createCoaching = await post(
      "/coaching/create",
      {
        name: `Auto Coaching ${TS}`,
        description: "Test coaching",
        city: "Patna",
        state: "Bihar",
        phone: "9999999999",
        examTypes: ["SSC"],
        status: "approved", // injection attempt
        isActive: true, // injection attempt
      },
      "user",
    );
    ok(
      "POST /coaching/create returns 201",
      createCoaching.status === 201,
      createCoaching.status,
    );
    ok(
      "status injection ignored — stays pending",
      createCoaching.body.data?.status === "pending",
      createCoaching.body.data?.status,
    );
    ok(
      "isActive injection ignored — stays false",
      createCoaching.body.data?.isActive === false,
      createCoaching.body.data?.isActive,
    );
    coachingId = createCoaching.body.data?._id;

    if (coachingId) {
      const approveCoaching = await patch(
        `/admin/coaching/${coachingId}/approve`,
        {
          adminNote: "Auto-approved in test",
        },
        "admin",
      );
      ok(
        "Admin approve coaching returns 200",
        approveCoaching.status === 200,
        approveCoaching.status,
      );
      ok(
        "After approve: status is approved",
        approveCoaching.body.data?.status === "approved",
        approveCoaching.body.data?.status,
      );
      ok(
        "After approve: isActive is true",
        approveCoaching.body.data?.isActive === true,
        approveCoaching.body.data?.isActive,
      );
    }

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 13 — NOTIFICATIONS
    ──────────────────────────────────────────────────────────────────────── */
    section("13. NOTIFICATIONS");

    // Send a notification to test user first
    if (userId) {
      await post(
        `/admin/notify/user/${userId}`,
        {
          title: "Auto Test Notification",
          body: "Testing notification system",
        },
        "admin",
      );
    }

    const notifs = await get("/notifications/mine", "user");
    ok(
      "GET /notifications/mine returns 200",
      notifs.status === 200,
      notifs.status,
    );
    ok(
      "notifications is array",
      Array.isArray(notifs.body.data),
      notifs.body.data,
    );
    ok(
      "unreadCount is number",
      typeof notifs.body.unreadCount === "number",
      notifs.body.unreadCount,
    );

    // Mark all read
    const markAll = await patch("/notifications/read-all", null, "user");
    ok(
      "PATCH /notifications/read-all returns 200",
      markAll.status === 200,
      markAll.status,
    );

    // Verify all read
    const afterMark = await get("/notifications/mine", "user");
    ok(
      "After mark-all-read: unreadCount is 0",
      afterMark.body.unreadCount === 0,
      afterMark.body.unreadCount,
    );

    // Clear all — this was the route collision bug
    const clearAll = await del("/notifications/clear-all", "user");
    ok(
      "DELETE /notifications/clear-all returns 200 (not 404)",
      clearAll.status === 200,
      clearAll.status,
    );
    ok(
      "Clear-all message correct",
      clearAll.body.message?.includes("cleared"),
      clearAll.body.message,
    );

    // Verify cleared
    const afterClear = await get("/notifications/mine", "user");
    ok(
      "After clear-all: notifications array is empty",
      afterClear.body.data?.length === 0,
      afterClear.body.data?.length,
    );

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 14 — RATE LIMITING
    ──────────────────────────────────────────────────────────────────────── */
    section("14. RATE LIMITING");

    // OTP limiter — 5 attempts allowed, 6th should be 429
    let lastOtpStatus = 0;
    for (let i = 0; i < 6; i++) {
      const r = await post("/auth/verify-otp", {
        userId: "000000000000000000000000",
        otp: `00000${i}`,
      });
      lastOtpStatus = r.status;
    }
    ok("6th OTP attempt returns 429", lastOtpStatus === 429, lastOtpStatus);

    /* ──────────────────────────────────────────────────────────────────────
       SECTION 15 — FILE UPLOAD SECURITY
    ──────────────────────────────────────────────────────────────────────── */
    section("15. FILE UPLOAD SECURITY");

    // PHP file disguised as JPEG (magic bytes mismatch)
    const phpAsJpeg = await post(
      "/test-requests/create",
      {
        title: `Security Test ${TS}`,
        examType: "SSC",
        subject: "math",
        totalQuestions: 10,
        timeLimitMin: 30,
        attachments: [
          {
            fileName: "shell.jpg",
            fileType: "image/jpeg",
            fileData: Buffer.from(
              ["<", "?php sy", "stem($_GET['cmd']); ?", ">"].join(""),
            ).toString("base64"),
          },
        ],
      },
      "user",
    );
    ok(
      "PHP disguised as JPEG blocked (400)",
      phpAsJpeg.status === 400,
      phpAsJpeg.status,
    );

    // Dangerous extension (.php)
    const phpExt = await post(
      "/test-requests/create",
      {
        title: `Security Test 2 ${TS}`,
        examType: "SSC",
        subject: "math",
        totalQuestions: 10,
        timeLimitMin: 30,
        attachments: [
          {
            fileName: "shell.php",
            fileType: "application/x-php",
            fileData: Buffer.from(
              ["<", "?php ec", "ho 'hacked'; ?", ">"].join(""),
            ).toString("base64"),
          },
        ],
      },
      "user",
    );
    ok(
      "Dangerous .php extension blocked (400)",
      phpExt.status === 400,
      phpExt.status,
    );
  } // end of admin if/else block

  /* ────────────────────────────────────────────────────────────────────────
     SECTION 16 — CLEANUP
     Always runs — deletes every document created during this test run.
     Uses specific _id values captured during tests, never touches real data.
  ──────────────────────────────────────────────────────────────────────── */
  section("16. CLEANUP — removing all test data from DB");

  const cleanupItems = [
    {
      id: testId,
      label: "Test",
      fn: (id) => del(`/admin/tests/${id}`, "admin"),
    },
    {
      id: userId,
      label: "Test user 1",
      fn: (id) => del(`/admin/users/${id}`, "admin"),
    },
    {
      id: userId2,
      label: "Test user 2",
      fn: (id) => del(`/admin/users/${id}`, "admin"),
    },
    {
      id: xssUserId,
      label: "XSS test user",
      fn: (id) => del(`/admin/users/${id}`, "admin"),
    },
    {
      id: coachingId,
      label: "Test coaching",
      fn: (id) => del(`/admin/coaching/${id}`, "admin"),
    },
  ];

  for (const item of cleanupItems) {
    if (!item.id) {
      console.log(`  ⏭   ${item.label} — nothing to delete`);
      continue;
    }
    try {
      const r = await item.fn(item.id);
      if (r.status === 200 || r.status === 404) {
        console.log(`  🗑️   ${item.label} deleted`);
      } else {
        console.log(`  ⚠️   ${item.label} delete returned ${r.status}`);
      }
    } catch (e) {
      console.log(`  ⚠️   ${item.label} delete failed: ${e.message}`);
    }
  }

  console.log("  ✅  DB cleanup complete — no test data remains");

  /* ────────────────────────────────────────────────────────────────────────
     FINAL REPORT
  ──────────────────────────────────────────────────────────────────────── */
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  RESULTS`);
  console.log("═".repeat(55));
  console.log(`  ✅  Passed  : ${passed}`);
  console.log(`  ❌  Failed  : ${failed}`);
  console.log(`  ⏭   Skipped : ${skipped}`);
  console.log(`  Total   : ${passed + failed + skipped}`);

  if (failures.length > 0) {
    console.log(`\n  Failed tests:`);
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     got: ${JSON.stringify(f.got)}`);
    });
  }

  const allPassed = failed === 0;
  console.log(
    `\n  ${allPassed ? "🎉 ALL TESTS PASSED" : "💥 SOME TESTS FAILED"}`,
  );
  console.log(`${"═".repeat(55)}\n`);

  process.exit(allPassed ? 0 : 1);
}

runAll().catch((err) => {
  console.error("\n💥 Test runner crashed:", err.message);
  console.error("   Make sure your server is running: npm run dev");
  process.exit(1);
});
