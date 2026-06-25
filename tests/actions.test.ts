import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  });

  return {
    prisma: {
      user: model(),
      group: model(),
      person: model(),
      chore: model(),
      choreParticipant: model(),
      emailVerificationCode: model(),
      membershipRequest: model(),
      expense: model(),
      expenseParticipant: model(),
      nettingSettlement: model(),
      nettingSettlementItem: model(),
      $transaction: vi.fn(),
    },
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    setFlashToast: vi.fn(),
    sendVerificationEmail: vi.fn(),
    bcryptHash: vi.fn(),
    createAdminSession: vi.fn(),
    createGroupAdminSession: vi.fn(),
    createSession: vi.fn(),
    createUserSession: vi.fn(),
    destroyAllSessions: vi.fn(),
    getCurrentAdmin: vi.fn(),
    requireAdmin: vi.fn(),
    requireGroupAdmin: vi.fn(),
    requirePerson: vi.fn(),
    requireUser: vi.fn(),
    verifyAdminPassword: vi.fn(),
    verifyPersonPassword: vi.fn(),
    verifySharedPassword: vi.fn(),
    verifyUserPassword: vi.fn(),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/email", () => ({ sendVerificationEmail: mocks.sendVerificationEmail }));
vi.mock("@/lib/flash-toast", () => ({ setFlashToast: mocks.setFlashToast }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.bcryptHash } }));
vi.mock("@/lib/auth", () => ({
  createAdminSession: mocks.createAdminSession,
  createGroupAdminSession: mocks.createGroupAdminSession,
  createSession: mocks.createSession,
  createUserSession: mocks.createUserSession,
  destroyAllSessions: mocks.destroyAllSessions,
  getCurrentAdmin: mocks.getCurrentAdmin,
  requireAdmin: mocks.requireAdmin,
  requireGroupAdmin: mocks.requireGroupAdmin,
  requirePerson: mocks.requirePerson,
  requireUser: mocks.requireUser,
  verifyAdminPassword: mocks.verifyAdminPassword,
  verifyPersonPassword: mocks.verifyPersonPassword,
  verifySharedPassword: mocks.verifySharedPassword,
  verifyUserPassword: mocks.verifyUserPassword,
}));

import * as actions from "@/app/actions";

const group = { id: "group-1", slug: "marketing", name: "Marketing", joinCode: "JOIN123", isActive: true };
const user = { id: "user-1", name: "Ali", email: "ali@example.com" };
const member = {
  id: "person-1",
  groupId: group.id,
  name: "Ali",
  username: "ali",
  passwordHash: null,
  type: "MEMBER",
  isGroupAdmin: false,
  isActive: true,
  group,
};
const groupAdmin = { ...member, id: "admin-1", username: "manager", isGroupAdmin: true };

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((item) => data.append(key, item));
    else data.set(key, value);
  }
  return data;
}

function expenseForm(overrides: Record<string, string | string[]> = {}) {
  return form({
    groupSlug: group.slug,
    title: "Team lunch",
    splitMode: "EQUAL",
    amount: "10000",
    paidByPersonId: member.id,
    date: "2026-06-22",
    participantIds: [member.id, "person-2"],
    ...overrides,
  });
}

async function expectRedirect(promise: Promise<unknown>, path: string) {
  await expect(promise).rejects.toThrow(`REDIRECT:${path}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.SESSION_SECRET = "test-secret";

  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mocks.bcryptHash.mockResolvedValue("hashed-password");
  mocks.sendVerificationEmail.mockResolvedValue({ delivered: true });
  mocks.verifyAdminPassword.mockResolvedValue(true);
  mocks.verifyPersonPassword.mockResolvedValue(true);
  mocks.verifySharedPassword.mockResolvedValue(true);
  mocks.verifyUserPassword.mockResolvedValue(true);
  mocks.getCurrentAdmin.mockResolvedValue(false);
  mocks.requireUser.mockResolvedValue(user);
  mocks.requirePerson.mockResolvedValue(member);
  mocks.requireGroupAdmin.mockResolvedValue(groupAdmin);
  mocks.prisma.chore.count.mockResolvedValue(0);
  mocks.prisma.choreParticipant.count.mockResolvedValue(0);
  mocks.prisma.$transaction.mockImplementation(async (operation: unknown) => {
    if (typeof operation === "function") {
      return (operation as (tx: typeof mocks.prisma) => Promise<unknown>)(mocks.prisma);
    }
    return Promise.all(operation as Promise<unknown>[]);
  });
});

describe("action coverage contract", () => {
  it("keeps every exported server action represented by this suite", () => {
    expect(Object.keys(actions).filter((name) => name.endsWith("Action")).sort()).toEqual([
      "adminLoginAction",
      "cancelChoreAction",
      "completeChoreAction",
      "confirmNettingAction",
      "createAccountGroupAction",
      "createChoreAction",
      "createExpenseAction",
      "deleteExpenseAction",
      "deleteGroupAction",
      "deletePersonAction",
      "editExpenseAction",
      "enterGroupAdminAction",
      "enterMembershipAction",
      "groupAdminLoginAction",
      "loginAction",
      "logoutAllAction",
      "markPaidAction",
      "resetPasswordAction",
      "reviewMembershipRequestAction",
      "selectGroupAction",
      "sendEmailCodeAction",
      "signupUserAction",
      "submitMembershipRequestAction",
      "toggleGuestPaymentAction",
      "updateParticipantShareAction",
      "upsertGroupAction",
      "upsertPersonAction",
      "userLoginAction",
    ]);
  });
});

describe("authentication and account actions", () => {
  it("sendEmailCodeAction invalidates old codes and stores a new normalized request", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    const result = await actions.sendEmailCodeAction(null, form({ email: " NEW@Example.com ", purpose: "USER_SIGNUP" }));

    expect(result).toMatchObject({ success: true });
    expect(mocks.prisma.emailVerificationCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ email: "new@example.com", purpose: "USER_SIGNUP" }),
    }));
    expect(mocks.prisma.emailVerificationCode.create).toHaveBeenCalledOnce();
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" }));
  });

  it("sendEmailCodeAction sends password reset codes only for registered users", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: user.id });
    const result = await actions.sendEmailCodeAction(null, form({ email: " ALI@Example.com ", purpose: "PASSWORD_RESET" }));

    expect(result).toMatchObject({ success: true });
    expect(mocks.prisma.emailVerificationCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ email: "ali@example.com", purpose: "PASSWORD_RESET" }),
    }));
    expect(mocks.prisma.emailVerificationCode.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: "ali@example.com", purpose: "PASSWORD_RESET" }),
    }));
  });

  it("signupUserAction persists the verified user and starts a user session", async () => {
    const email = "new@example.com";
    const code = "123456";
    const codeHash = createHash("sha256").update(`${email}:USER_SIGNUP:${code}:test-secret`).digest("hex");
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.prisma.emailVerificationCode.findFirst.mockResolvedValue({
      id: "code-1",
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mocks.prisma.user.create.mockResolvedValue({ ...user, email });

    await expectRedirect(actions.signupUserAction(null, form({ name: "New User", email, password: "secret12", code })), "/account");

    expect(mocks.prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email }) }));
    expect(mocks.prisma.emailVerificationCode.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "code-1" } }));
    expect(mocks.createUserSession).toHaveBeenCalledWith(user.id);
  });

  it("userLoginAction verifies the stored password and opens the account", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: "stored-hash" });

    await expectRedirect(actions.userLoginAction(null, form({ email: user.email, password: "secret12" })), "/account");

    expect(mocks.verifyUserPassword).toHaveBeenCalledWith("secret12", "stored-hash");
    expect(mocks.createUserSession).toHaveBeenCalledWith(user.id);
  });

  it("resetPasswordAction verifies the reset code, stores the new password, and opens the account", async () => {
    const code = "654321";
    const codeHash = createHash("sha256").update(`${user.email}:PASSWORD_RESET:${code}:test-secret`).digest("hex");
    mocks.prisma.user.findUnique.mockResolvedValue({ ...user });
    mocks.prisma.emailVerificationCode.findFirst.mockResolvedValue({
      id: "code-2",
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expectRedirect(
      actions.resetPasswordAction(null, form({ email: user.email, code, password: "newsecret", confirmPassword: "newsecret" })),
      "/account",
    );

    expect(mocks.bcryptHash).toHaveBeenCalledWith("newsecret", 10);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: user.id },
      data: { passwordHash: "hashed-password" },
    }));
    expect(mocks.prisma.emailVerificationCode.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "code-2" } }));
    expect(mocks.createUserSession).toHaveBeenCalledWith(user.id);
  });

  it("createAccountGroupAction creates a group and its first group admin atomically", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(null);
    mocks.prisma.group.findUnique.mockResolvedValue(null);
    mocks.prisma.group.create.mockResolvedValue(group);
    mocks.prisma.person.create.mockResolvedValue({ id: groupAdmin.id });

    await expectRedirect(actions.createAccountGroupAction(form({ name: group.name, slug: group.slug })), `/${group.slug}/admin`);

    expect(mocks.prisma.group.create).toHaveBeenCalledOnce();
    expect(mocks.prisma.person.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ groupId: group.id, userId: user.id, isGroupAdmin: true }),
    }));
    expect(mocks.createGroupAdminSession).toHaveBeenCalledWith(groupAdmin.id);
  });

  it("submitMembershipRequestAction upserts a request for the resolved group", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findFirst.mockResolvedValue(null);

    await actions.submitMembershipRequestAction(form({ groupIdentifier: group.joinCode }));

    expect(mocks.prisma.membershipRequest.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_groupId: { userId: user.id, groupId: group.id } },
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account");
  });

  it("enterMembershipAction only enters a membership belonging to the signed-in user", async () => {
    mocks.prisma.person.findFirst.mockResolvedValue(member);
    await expectRedirect(actions.enterMembershipAction(form({ personId: member.id })), `/${group.slug}/dashboard`);
    expect(mocks.createSession).toHaveBeenCalledWith(member.id);
    expect(mocks.prisma.person.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: member.id, userId: user.id, isActive: true }),
    }));
  });

  it("enterGroupAdminAction requires an active admin membership owned by the user", async () => {
    mocks.prisma.person.findFirst.mockResolvedValue(groupAdmin);
    await expectRedirect(actions.enterGroupAdminAction(form({ personId: groupAdmin.id })), `/${group.slug}/admin`);
    expect(mocks.createGroupAdminSession).toHaveBeenCalledWith(groupAdmin.id);
    expect(mocks.prisma.person.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: user.id, isGroupAdmin: true }),
    }));
  });

  it("selectGroupAction resolves the group before continuing to login", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    await expectRedirect(actions.selectGroupAction(null, form({ groupSlug: "Marketing" })), "/login");
    expect(mocks.prisma.group.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ slug: group.slug }) }));
  });

  it("loginAction uses a personal password when one exists", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findFirst.mockResolvedValue({ ...member, passwordHash: "personal-hash" });
    await expectRedirect(actions.loginAction(null, form({ groupSlug: group.slug, username: member.username, password: "new-pass" })), `/${group.slug}/dashboard`);
    expect(mocks.verifyPersonPassword).toHaveBeenCalledWith("new-pass", "personal-hash");
    expect(mocks.verifySharedPassword).not.toHaveBeenCalled();
  });

  it("adminLoginAction creates the central admin session", async () => {
    await expectRedirect(actions.adminLoginAction(null, form({ password: "1qaz@WSX" })), "/admin");
    expect(mocks.verifyAdminPassword).toHaveBeenCalledWith("1qaz@WSX");
    expect(mocks.createAdminSession).toHaveBeenCalledOnce();
  });

  it("groupAdminLoginAction accepts only an active admin in the selected group", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findFirst.mockResolvedValue({ ...groupAdmin, passwordHash: "admin-hash" });
    await expectRedirect(actions.groupAdminLoginAction(null, form({ groupSlug: group.slug, username: groupAdmin.username, password: "group-pass" })), `/${group.slug}/admin`);
    expect(mocks.prisma.person.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ groupId: group.id, isGroupAdmin: true }),
    }));
  });

  it("logoutAllAction destroys every session", async () => {
    await expectRedirect(actions.logoutAllAction(), "/login");
    expect(mocks.destroyAllSessions).toHaveBeenCalledOnce();
  });
});

describe("group, membership, and people actions", () => {
  it("upsertGroupAction creates a group together with its password-protected admin", async () => {
    mocks.prisma.group.findUnique.mockResolvedValue(null);
    mocks.prisma.group.create.mockResolvedValue(group);

    await expectRedirect(actions.upsertGroupAction(form({
      name: group.name,
      slug: group.slug,
      isActive: "on",
      adminName: "Group Manager",
      adminUsername: "manager",
      adminPassword: "secret12",
    })), `/admin/groups/${group.slug}`);

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.bcryptHash).toHaveBeenCalledWith("secret12", 12);
    expect(mocks.prisma.group.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        people: { create: expect.objectContaining({ username: "manager", isGroupAdmin: true, passwordHash: "hashed-password" }) },
      }),
    }));
  });

  it("reviewMembershipRequestAction approves a request inside its own group", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.membershipRequest.findFirst.mockResolvedValue({
      id: "request-1",
      groupId: group.id,
      userId: user.id,
      status: "PENDING",
      user,
    });
    mocks.prisma.person.findFirst.mockResolvedValue(null);

    await actions.reviewMembershipRequestAction(form({ requestId: "request-1", groupSlug: group.slug, decision: "approve" }));

    expect(mocks.prisma.membershipRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "request-1", groupId: group.id } }));
    expect(mocks.prisma.person.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ groupId: group.id, userId: user.id }) }));
    expect(mocks.prisma.membershipRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED" }) }));
  });

  it("deleteGroupAction removes dependent expense data before the group", async () => {
    mocks.prisma.group.findUnique.mockResolvedValue({ name: group.name });
    mocks.prisma.expense.findMany.mockResolvedValue([{ id: "expense-1" }]);

    await expectRedirect(actions.deleteGroupAction(form({ id: group.id })), "/admin");

    expect(mocks.prisma.expenseParticipant.deleteMany).toHaveBeenCalledWith({ where: { expenseId: { in: ["expense-1"] } } });
    expect(mocks.prisma.expense.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["expense-1"] } } });
    expect(mocks.prisma.chore.deleteMany).toHaveBeenCalledWith({ where: { groupId: group.id } });
    expect(mocks.prisma.person.deleteMany).toHaveBeenCalledWith({ where: { groupId: group.id } });
    expect(mocks.prisma.group.delete).toHaveBeenCalledWith({ where: { id: group.id } });
  });

  it("upsertPersonAction lets a group admin add a password-protected member", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    await actions.upsertPersonAction(form({
      groupSlug: group.slug,
      groupId: group.id,
      name: "Sara",
      username: "sara",
      type: "MEMBER",
      password: "member-pass",
      isActive: "on",
      isGroupAdmin: "on",
    }));

    expect(mocks.bcryptHash).toHaveBeenCalledWith("member-pass", 12);
    expect(mocks.prisma.person.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      groupId: group.id,
      username: "sara",
      passwordHash: "hashed-password",
      isGroupAdmin: true,
    }) });
  });

  it("upsertPersonAction prevents the central admin from setting group login credentials", async () => {
    mocks.getCurrentAdmin.mockResolvedValue(true);
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    await actions.upsertPersonAction(form({
      groupSlug: group.slug,
      groupId: group.id,
      name: "Sara",
      username: "sara",
      type: "MEMBER",
      password: "should-not-be-stored",
      isActive: "on",
    }));

    expect(mocks.bcryptHash).not.toHaveBeenCalled();
    expect(mocks.prisma.person.create).toHaveBeenCalledWith({ data: expect.objectContaining({ passwordHash: null }) });
  });

  it("deletePersonAction deletes a member with no historical references", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findFirst.mockResolvedValue({ ...member, id: "person-2" });
    mocks.prisma.expense.count.mockResolvedValue(0);
    mocks.prisma.expenseParticipant.count.mockResolvedValue(0);

    await actions.deletePersonAction(form({ id: "person-2", groupSlug: group.slug }));

    expect(mocks.prisma.person.delete).toHaveBeenCalledWith({ where: { id: "person-2" } });
  });

  it("deletePersonAction preserves expense history by converting a referenced member to a guest", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findFirst.mockResolvedValue({ ...member, id: "person-2" });
    mocks.prisma.expense.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    mocks.prisma.expenseParticipant.count.mockResolvedValue(0);

    await actions.deletePersonAction(form({ id: "person-2", groupSlug: group.slug }));

    expect(mocks.prisma.person.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "person-2" },
      data: expect.objectContaining({ type: "GUEST", username: null, passwordHash: null, isGroupAdmin: false }),
    }));
    expect(mocks.prisma.person.delete).not.toHaveBeenCalled();
  });

  it("createChoreAction lets a group admin assign a non-expense task to active members", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findMany.mockResolvedValue([{ id: member.id }, { id: "person-2" }]);

    await actions.createChoreAction(form({
      groupSlug: group.slug,
      type: "DISHES",
      status: "ASSIGNED",
      scheduledFor: "2026-06-22",
      participantIds: [member.id, "person-2"],
      [`intensity-${member.id}`]: "LIGHT",
      "intensity-person-2": "HEAVY",
    }));

    expect(mocks.requireGroupAdmin).toHaveBeenCalledWith(group.slug);
    expect(mocks.prisma.chore.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        groupId: group.id,
        type: "DISHES",
        title: "ظرف شستن",
        status: "ASSIGNED",
        assignedByPersonId: groupAdmin.id,
        people: {
          create: [
            { personId: member.id, intensity: "LIGHT", score: 1 },
            { personId: "person-2", intensity: "HEAVY", score: 3 },
          ],
        },
      }),
    }));
  });

  it("completeChoreAction turns an assigned task into a scored completed task", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.chore.findFirst.mockResolvedValue({ id: "chore-1", groupId: group.id, status: "ASSIGNED" });

    await actions.completeChoreAction(form({ groupSlug: group.slug, choreId: "chore-1" }));

    expect(mocks.prisma.chore.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "chore-1" },
      data: expect.objectContaining({ status: "COMPLETED", completedAt: expect.any(Date) }),
    }));
  });

  it("cancelChoreAction cancels a task inside the current group only", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.chore.findFirst.mockResolvedValue({ id: "chore-1", groupId: group.id, status: "ASSIGNED" });

    await actions.cancelChoreAction(form({ groupSlug: group.slug, choreId: "chore-1" }));

    expect(mocks.prisma.chore.findFirst).toHaveBeenCalledWith({ where: { id: "chore-1", groupId: group.id } });
    expect(mocks.prisma.chore.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "CANCELLED", completedAt: null }),
    }));
  });
});

describe("expense, share, and payment actions", () => {
  it("createExpenseAction stores rounded shares whose total equals the original expense", async () => {
    const people = Array.from({ length: 8 }, (_, index) => ({ id: index === 0 ? member.id : `person-${index + 1}`, type: "MEMBER" }));
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findMany.mockResolvedValue(people);
    mocks.prisma.expense.create.mockResolvedValue({ id: "expense-1", title: "Team lunch" });

    await expectRedirect(actions.createExpenseAction(expenseForm({
      amount: "250000",
      participantIds: people.map((person) => person.id),
    })), `/${group.slug}/expenses/expense-1`);

    const createCall = mocks.prisma.expense.create.mock.calls[0][0];
    const shares = createCall.data.participants.create.map((participant: { shareAmount: number }) => participant.shareAmount);
    expect(shares).toEqual([26_000, 32_000, 32_000, 32_000, 32_000, 32_000, 32_000, 32_000]);
    expect(shares.reduce((sum: number, value: number) => sum + value, 0)).toBe(250_000);
  });

  it("createExpenseAction rejects a participant from another group", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.person.findMany.mockResolvedValue([{ id: member.id, type: "MEMBER" }]);

    await actions.createExpenseAction(expenseForm());

    expect(mocks.prisma.expense.create).not.toHaveBeenCalled();
    expect(mocks.setFlashToast).toHaveBeenCalledWith("error", "یکی از افراد این خرج در این گروه معتبر نیست.");
  });

  it("createExpenseAction keeps the central admin read-only", async () => {
    mocks.getCurrentAdmin.mockResolvedValue(true);
    mocks.prisma.group.findFirst.mockResolvedValue(group);

    await actions.createExpenseAction(expenseForm({ adminMode: "on" }));

    expect(mocks.prisma.expense.create).not.toHaveBeenCalled();
    expect(mocks.setFlashToast).toHaveBeenCalledWith("error", expect.stringContaining("فقط گزارش"));
  });

  it("editExpenseAction replaces equal-split participants and persists the edited values", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.expense.findFirst.mockResolvedValue({
      id: "expense-1",
      groupId: group.id,
      createdByPersonId: member.id,
      splitMode: "EQUAL",
    });
    mocks.prisma.person.findMany.mockResolvedValue([{ id: member.id, type: "MEMBER" }, { id: "person-2", type: "MEMBER" }]);
    mocks.prisma.expenseParticipant.deleteMany.mockResolvedValue({ count: 2 });
    mocks.prisma.expense.update.mockResolvedValue({ id: "expense-1" });

    await expectRedirect(actions.editExpenseAction(expenseForm({ id: "expense-1", title: "Edited lunch", amount: "12000" })), `/${group.slug}/expenses/expense-1`);

    expect(mocks.prisma.expenseParticipant.deleteMany).toHaveBeenCalledWith({ where: { expenseId: "expense-1" } });
    expect(mocks.prisma.expense.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: "Edited lunch", amount: 12_000 }),
    }));
  });

  it("deleteExpenseAction soft-deletes an expense created by the current member", async () => {
    mocks.prisma.group.findFirst.mockResolvedValue(group);
    mocks.prisma.expense.findFirst.mockResolvedValue({ id: "expense-1", title: "Team lunch", createdByPersonId: member.id });

    await expectRedirect(actions.deleteExpenseAction(form({ groupSlug: group.slug, id: "expense-1" })), `/${group.slug}/expenses`);

    expect(mocks.prisma.expense.update).toHaveBeenCalledWith({ where: { id: "expense-1" }, data: { status: "CANCELLED" } });
  });

  it("updateParticipantShareAction lets a member set only their own custom share and recalculates the total", async () => {
    const participant = { id: "participant-1", personId: member.id, person: { type: "MEMBER" } };
    mocks.prisma.expense.findFirst.mockResolvedValue({ id: "expense-1", participants: [participant] });
    mocks.prisma.expenseParticipant.findMany.mockResolvedValue([{ shareAmount: 12_000 }, { shareAmount: 8_000 }]);

    await actions.updateParticipantShareAction(form({
      groupSlug: group.slug,
      expenseId: "expense-1",
      participantId: participant.id,
      shareAmount: "12000",
    }));

    expect(mocks.prisma.expenseParticipant.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: participant.id }, data: expect.objectContaining({ shareAmount: 12_000 }) }));
    expect(mocks.prisma.expense.update).toHaveBeenCalledWith({ where: { id: "expense-1" }, data: { amount: 20_000 } });
  });

  it("markPaidAction records the current member payment and optional date", async () => {
    mocks.prisma.expenseParticipant.findFirst.mockResolvedValue({
      id: "participant-1",
      shareAmount: 10_000,
      nettedAmount: 0,
      paymentStatus: "UNPAID",
      expense: { id: "expense-1", title: "Team lunch", paidByPersonId: "person-2" },
    });

    await actions.markPaidAction(form({ groupSlug: group.slug, expenseId: "expense-1", paidAt: "2026-06-22" }));

    expect(mocks.prisma.expenseParticipant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "participant-1" },
      data: expect.objectContaining({ paymentStatus: "PAID", markedByPersonId: member.id, paidAt: expect.any(Date) }),
    }));
  });

  it("toggleGuestPaymentAction toggles a guest payment without changing another group", async () => {
    mocks.prisma.expenseParticipant.findFirst.mockResolvedValue({
      id: "participant-guest",
      expenseId: "expense-1",
      paymentStatus: "UNPAID",
      expense: { id: "expense-1", title: "Team lunch" },
      person: { id: "guest-1", name: "Guest", type: "GUEST" },
    });

    await actions.toggleGuestPaymentAction(form({ groupSlug: group.slug, participantId: "participant-guest" }));

    expect(mocks.prisma.expenseParticipant.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "participant-guest", expense: { groupId: group.id } }),
    }));
    expect(mocks.prisma.expenseParticipant.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: "PAID", markedByPersonId: member.id }),
    }));
  });

  it("confirmNettingAction rejects netting when the pair is not eligible", async () => {
    mocks.prisma.person.findFirst.mockResolvedValueOnce({ id: "person-2", groupId: group.id, type: "MEMBER", isActive: true });
    mocks.prisma.expense.findMany.mockResolvedValue([
      {
        id: "expense-1",
        title: "Lunch",
        date: new Date("2026-06-01"),
        paidByPersonId: "person-2",
        paidBy: { id: "person-2", name: "Reza" },
        participants: [{ id: "participant-1", personId: member.id, shareAmount: 100, nettedAmount: 0, paymentStatus: "UNPAID" }],
      },
    ]);

    await actions.confirmNettingAction(form({ groupSlug: group.slug, counterpartyPersonId: "person-2" }));

    expect(mocks.setFlashToast).toHaveBeenCalledWith("error", expect.stringContaining("تهاتر"));
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
