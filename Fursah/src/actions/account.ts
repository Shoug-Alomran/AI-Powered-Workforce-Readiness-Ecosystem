"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  firebaseAdminConfigured,
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from "@/lib/firebase-admin";
import { randomUUID } from "node:crypto";
import { uploadPrivateDocument } from "@/lib/r2";

export type AccountUpdateState = {
  error?: string;
  success?: string;
};

export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/student", "layout");
}

function emailDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export async function updateAccountCredentials(
  _previous: AccountUpdateState,
  formData: FormData
): Promise<AccountUpdateState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error:
        "Your session has expired. Please sign in again.",
    };
  }

  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? ""
  );

  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );

  if (!email || !email.includes("@")) {
    return {
      error: "Enter a valid email address.",
    };
  }

  const protectedOrganizationAccount =
    user.role === "EMPLOYER" ||
    user.role === "UNIVERSITY";

  const verifiedDomain =
    emailDomain(user.email);

  if (
    protectedOrganizationAccount &&
    emailDomain(email) !== verifiedDomain
  ) {
    return {
      error:
        `Use your verified organization domain: @${verifiedDomain}`,
    };
  }

  if (
    password &&
    password.length < 8
  ) {
    return {
      error:
        "Your new password must be at least 8 characters.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error:
        "The password confirmation does not match.",
    };
  }

  const duplicate =
    await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: user.id,
        },
      },
    });

  if (duplicate) {
    return {
      error:
        "That email address is already connected to another account.",
    };
  }

  let firebaseUid: string | null =
    null;

  if (firebaseAdminConfigured) {
    const auth =
      getFirebaseAdminAuth();

    try {
      firebaseUid = (
        await auth.getUser(user.id)
      ).uid;
    } catch {
      try {
        firebaseUid = (
          await auth.getUserByEmail(
            user.email
          )
        ).uid;
      } catch {
        firebaseUid = null;
      }
    }

    if (
      password &&
      !firebaseUid
    ) {
      return {
        error:
          "Password changes are unavailable for prepared demo accounts. Sign in with a registered account to manage a password.",
      };
    }

    if (firebaseUid) {
      await auth.updateUser(
        firebaseUid,
        {
          ...(email !== user.email
            ? {
                email,
                emailVerified: false,
              }
            : {}),

          ...(password
            ? {
                password,
              }
            : {}),
        }
      );

      await getFirebaseAdminDb()
        .collection("users")
        .doc(firebaseUid)
        .set(
          {
            email,
            updatedAt:
              new Date().toISOString(),
          },
          {
            merge: true,
          }
        );
    }
  } else if (password) {
    return {
      error:
        "Password changes require the secure authentication service to be configured.",
    };
  }

  if (email !== user.email) {
    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        email,
      },
    });
  }

  revalidatePath(
    "/employer/profile"
  );

  revalidatePath(
    "/university/profile"
  );

  revalidatePath(
    "/student/account"
  );

  revalidatePath(
    "/admin/profile"
  );

  return {
    success: password
      ? "Email and password updated."
      : "Email updated.",
  };
}

export async function updateProfileImage(
  formData: FormData
) {
  const user =
    await getCurrentUser();

  if (!user) {
    return;
  }

  const image =
    formData.get("profileImage");

  if (
    !(image instanceof File) ||
    image.size === 0
  ) {
    return;
  }

  const allowed =
    new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

  if (!allowed.has(image.type)) {
    throw new Error(
      "Choose a JPG, PNG, WebP, or GIF image."
    );
  }

  if (
    image.size >
    5 * 1024 * 1024
  ) {
    throw new Error(
      "Profile images must be 5 MB or smaller."
    );
  }

  const extension =
    (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      } as Record<string, string>
    )[image.type];

  const storageKey =
    `profiles/${user.id}/` +
    `${randomUUID()}.${extension}`;

  await uploadPrivateDocument(
    storageKey,
    new Uint8Array(
      await image.arrayBuffer()
    ),
    image.type
  );

  await prisma.evidenceDocument.create({
    data: {
      ownerUserId: user.id,

      contextType:
        "PROFILE_IMAGE",

      contextId:
        user.id,

      purpose:
        "Account profile image",

      storageKey,

      originalName:
        image.name.slice(
          0,
          180
        ),

      mimeType:
        image.type,

      sizeBytes:
        image.size,

      // Profile images do not enter the AI evidence pipeline.
      // Mark the AI step as complete with an explicit non-evidence result.
      aiStatus:
        "COMPLETED",

      aiAnalysis: {
        documentType:
          "profile image",

        title:
          null,

        issuer:
          null,

        issueDate:
          null,

        expiryDate:
          null,

        skills:
          [],

        overallConfidence:
          1,

        reviewNote:
          "Profile image upload. AI evidence extraction is not required.",
      },

      aiAnalyzedAt:
        new Date(),

      reviewStatus:
        "APPROVED",

      reviewNote:
        "User-provided profile image.",
    },
  });

  revalidatePath(
    "/student/account"
  );

  revalidatePath(
    "/student/profile"
  );

  revalidatePath(
    "/student/dashboard"
  );

  revalidatePath(
    "/employer/profile"
  );

  revalidatePath(
    "/employer/dashboard"
  );

  revalidatePath(
    "/university/profile"
  );

  revalidatePath(
    "/university/dashboard"
  );

  revalidatePath(
    "/admin/dashboard"
  );

  revalidatePath(
    "/admin/profile"
  );
}
