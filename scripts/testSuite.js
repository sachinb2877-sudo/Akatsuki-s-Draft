const BASE_URL = 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition, testName, extraInfo = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${extraInfo}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log("  Running Akatsuki's Draft Automated Integration Test Suite ");
  console.log('============================================================\n');

  // 1. Health Check
  const health = await request('/health');
  assert(health.status === 200 && health.data?.success === true, 'GET /health returns 200');

  // 2. Register Regular User
  const randomSuffix = Date.now();
  const testUser = {
    name: `Shinobi ${randomSuffix}`,
    email: `shinobi_${randomSuffix}@konoha.dev`,
    password: 'securePassword123',
  };

  const regRes = await request('/auth/register', {
    method: 'POST',
    body: testUser,
  });
  assert(regRes.status === 201 && regRes.data?.data?.token, 'POST /auth/register creates user and returns JWT');
  const userToken = regRes.data?.data?.token;
  const userId = regRes.data?.data?.user?._id;

  // 3. Register Duplicate Email (409)
  const dupRes = await request('/auth/register', {
    method: 'POST',
    body: testUser,
  });
  assert(dupRes.status === 409, 'POST /auth/register with duplicate email returns 409');

  // 4. Register with invalid data (400)
  const badReg = await request('/auth/register', {
    method: 'POST',
    body: { email: 'bad' },
  });
  assert(badReg.status === 400, 'POST /auth/register with missing fields returns 400');

  // 5. Login as User
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: testUser.email, password: testUser.password },
  });
  assert(loginRes.status === 200 && loginRes.data?.data?.token, 'POST /auth/login returns 200 with JWT');

  // 6. Login with Wrong Password (401)
  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: testUser.email, password: 'wrongpassword' },
  });
  assert(badLogin.status === 401, 'POST /auth/login with wrong password returns 401');

  // 7. Get Current User Profile (GET /auth/me)
  const meRes = await request('/auth/me', { token: userToken });
  assert(meRes.status === 200 && meRes.data?.data?.user?.email === testUser.email, 'GET /auth/me returns user profile');

  // 8. Admin Login
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@akatsuki.dev', password: 'admin123' },
  });
  assert(adminLoginRes.status === 200 && adminLoginRes.data?.data?.token, 'POST /auth/login with seeded admin returns 200');
  const adminToken = adminLoginRes.data?.data?.token;

  // 9. Regular user attempting to access Admin endpoint (403)
  const unauthorizedAdmin = await request('/admin/posts/pending', { token: userToken });
  assert(unauthorizedAdmin.status === 403, 'GET /admin/posts/pending returns 403 for non-admin user');

  // 10. Create Draft Post (POST /posts)
  const createDraft = await request('/posts', {
    method: 'POST',
    token: userToken,
    body: {
      title: 'Secret Ninjutsu Scroll',
      content: 'Classified ninja techniques.',
      category: 'ninjutsu',
    },
  });
  assert(createDraft.status === 201 && createDraft.data?.data?.post?.status === 'draft', 'POST /posts creates post with default status "draft"');
  const draftPostId = createDraft.data?.data?.post?._id;

  // 11. Create Pending Post (POST /posts with status "pending")
  const createPending = await request('/posts', {
    method: 'POST',
    token: userToken,
    body: {
      title: 'Chakra Nature Transformation',
      content: 'Mastering fire, water, wind, earth, and lightning style chakra.',
      category: 'training',
      status: 'pending',
    },
  });
  assert(createPending.status === 201 && createPending.data?.data?.post?.status === 'pending', 'POST /posts with status "pending" creates pending post');
  const pendingPostId = createPending.data?.data?.post?._id;

  // 12. Reject invalid status on creation (status: "approved" -> 400)
  const illegalCreate = await request('/posts', {
    method: 'POST',
    token: userToken,
    body: {
      title: 'Hacked Post',
      content: 'Attempting to self-approve.',
      status: 'approved',
    },
  });
  assert(illegalCreate.status === 400, 'POST /posts with status "approved" returns 400');

  // 13. Public Feed (GET /posts) returns ONLY approved posts
  const publicFeed = await request('/posts');
  const containsUnapproved = publicFeed.data?.data?.posts?.some(p => p._id === draftPostId || p._id === pendingPostId);
  assert(publicFeed.status === 200 && !containsUnapproved, 'GET /posts returns 200 and excludes draft/pending posts');

  // 14. GET /posts/my-posts returns all user posts
  const myPosts = await request('/posts/my-posts', { token: userToken });
  const hasDraft = myPosts.data?.data?.posts?.some(p => p._id === draftPostId);
  const hasPending = myPosts.data?.data?.posts?.some(p => p._id === pendingPostId);
  assert(myPosts.status === 200 && hasDraft && hasPending, 'GET /posts/my-posts returns user drafts and pending posts');

  // 15. GET /posts/:id on unapproved post returns 404
  const unapprovedView = await request(`/posts/${pendingPostId}`);
  assert(unapprovedView.status === 404, 'GET /posts/:id for non-approved post returns 404');

  // 16. Admin approves pending post (PATCH /admin/posts/approve/:id)
  const approveRes = await request(`/admin/posts/approve/${pendingPostId}`, {
    method: 'PATCH',
    token: adminToken,
  });
  assert(approveRes.status === 200 && approveRes.data?.data?.post?.status === 'approved', 'PATCH /admin/posts/approve/:id sets status to "approved"');

  // 17. Now public GET /posts/:id returns the approved post
  const approvedView = await request(`/posts/${pendingPostId}`);
  assert(approvedView.status === 200 && approvedView.data?.data?.post?.title === 'Chakra Nature Transformation', 'GET /posts/:id returns approved post');

  // 18. Editing an approved post resets status to "pending"
  const editRes = await request(`/posts/${pendingPostId}`, {
    method: 'PATCH',
    token: userToken,
    body: {
      title: 'Chakra Nature Transformation - Revised Edition',
      content: 'Updated content with Yin and Yang release details.',
    },
  });
  assert(editRes.status === 200 && editRes.data?.data?.post?.status === 'pending', 'PATCH /posts/:id editing approved post resets status to "pending"');

  // 19. Admin rejects the revised post with reason
  const rejectRes = await request(`/admin/posts/reject/${pendingPostId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { reason: 'Requires further clarification on Yin-Yang release.' },
  });
  assert(rejectRes.status === 200 && rejectRes.data?.data?.post?.status === 'rejected' && rejectRes.data?.data?.post?.rejectionReason, 'PATCH /admin/posts/reject/:id sets status to "rejected" and stores reason');

  // 20. Non-owner cannot update or delete post (403)
  const anotherUserRes = await request('/auth/register', {
    method: 'POST',
    body: {
      name: `Rival ${randomSuffix}`,
      email: `rival_${randomSuffix}@konoha.dev`,
      password: 'anotherPassword123',
    },
  });
  const rivalToken = anotherUserRes.data?.data?.token;

  const rivalEdit = await request(`/posts/${draftPostId}`, {
    method: 'PATCH',
    token: rivalToken,
    body: { title: 'Hijacked Title' },
  });
  assert(rivalEdit.status === 403, 'PATCH /posts/:id by non-owner returns 403');

  const rivalDelete = await request(`/posts/${draftPostId}`, {
    method: 'DELETE',
    token: rivalToken,
  });
  assert(rivalDelete.status === 403, 'DELETE /posts/:id by non-owner returns 403');

  // 21. Owner deletes post (DELETE /posts/:id)
  const deleteRes = await request(`/posts/${draftPostId}`, {
    method: 'DELETE',
    token: userToken,
  });
  assert(deleteRes.status === 200, 'DELETE /posts/:id by owner returns 200');

  // 22. Unknown route returns 404
  const unknownRes = await request('/random-nonexistent-route');
  assert(unknownRes.status === 404 && unknownRes.data?.success === false, 'Non-existent route returns 404');

  // 23. Invalid ObjectId returns 400
  const badIdRes = await request('/posts/not-an-objectid');
  assert(badIdRes.status === 400, 'Invalid ObjectId format returns 400');

  console.log('\n============================================================');
  console.log(`  Test Suite Completed: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test Suite crashed:', err);
  process.exit(1);
});
