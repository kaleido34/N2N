"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { ProfileSettingsForm } from "./ProfileSettingsForm";
import { DeactivateAccountDialog } from "./DeactivateAccountDialog";
import { useAuth } from "@/hooks/auth-provider";
import { Form } from "@/components/ui/form";
import { Mail, CheckCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const profileFormSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    firstName: z
      .string()
      .min(1, { message: "First name is required" })
      .max(50, { message: "First name cannot exceed 50 characters" }),
    lastName: z
      .string()
      .min(1, { message: "Last name is required" })
      .max(50, { message: "Last name cannot exceed 50 characters" }),

    // Make password fields optional
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const { currentPassword, newPassword, confirmNewPassword } = data;

    // If user enters newPassword or confirmNewPassword, they must provide currentPassword.
    const wantsToChangePassword =
      Boolean(newPassword) || Boolean(confirmNewPassword);

    if (wantsToChangePassword) {
      // Must provide current password
      if (!currentPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["currentPassword"],
          message:
            "Please enter your current password to change your password.",
        });
      }

      // newPassword is required if user is changing password
      if (!newPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["newPassword"],
          message: "New password is required if you want to change it.",
        });
      } else if (newPassword.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["newPassword"],
          message: "New password must be at least 8 characters.",
        });
      }

      // confirmNewPassword is required if user is changing password
      if (!confirmNewPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmNewPassword"],
          message: "Please confirm your new password.",
        });
      }

      // newPassword and confirmNewPassword must match
      if (
        newPassword &&
        confirmNewPassword &&
        newPassword !== confirmNewPassword
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmNewPassword"],
          message: "New passwords do not match.",
        });
      }
    }
  });

const deactivateFormSchema = z.object({
  password: z.string().min(1, { message: "Password is required" }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type DeactivateFormValues = z.infer<typeof deactivateFormSchema>;

export function SettingsPage() {
  const router = useRouter();
  const { user, updateUserData, logout } = useAuth();

  // Ensure user is authenticated
  React.useEffect(() => {
    if (!user) {
      router.replace("/signin");
    }
  }, [user, router]);

  // State for Profile form submission
  const [isLoading, setIsLoading] = React.useState(false);

  // State for Deactivate form submission
  const [isDeactivating, setIsDeactivating] = React.useState(false);

  // State for password visibility toggles
  const [showPassword, setShowPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // -- Profile Form Setup --
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: user?.email || "",
      firstName: user?.first_name || "",
      lastName: user?.last_name || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  // -- Deactivate Form Setup --
  const deactivateForm = useForm<DeactivateFormValues>({
    resolver: zodResolver(deactivateFormSchema),
    defaultValues: {
      password: "",
    },
  });

  // -- Update Profile Submit Handler --
  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    try {
      const wantsToChangePassword = Boolean(data.newPassword);

      if (wantsToChangePassword) {
        // Validate and update password logic here
      }

      // Simulate an API call (replace with real backend call)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      updateUserData({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
      });

      toast.success("Profile updated successfully");

      // Clear password fields after success
      form.reset({
        ...data,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  }

  // -- Deactivate Account Submit Handler --
  async function onDeactivate() {
    setIsDeactivating(true);
    try {
      // Simulate account deactivation (replace with real API call)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Account deactivated successfully");
      logout();
      router.replace("/");
    } catch {
      toast.error("Failed to deactivate account");
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#F3F0FF] via-[#FAF7F8] to-[#E9E3FF] dark:from-[#18132A] dark:via-[#23223A] dark:to-[#1E1A2E] p-4">
      <div className="relative w-full max-w-2xl mx-auto rounded-2xl shadow-2xl bg-white/90 dark:bg-[#18132A]/90 border border-[#E5E5EF] dark:border-[#23223A] p-0 overflow-hidden">
        {/* Back Button */}
        <button
          className="absolute top-4 left-4 flex items-center gap-2 text-[#7B5EA7] dark:text-[#C7AFFF] hover:text-[#E5735A] dark:hover:text-[#E58C5A] font-semibold transition-colors z-10"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <div className="px-8 pt-16 pb-8">
          <h2 className="text-2xl font-bold mb-2">Profile Settings</h2>
          <div className="border-b border-dashed border-[#E5E5EF] dark:border-[#23223A] mb-6" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Basic Information Section */}
              <h3 className="text-lg font-semibold mb-4 text-[#7B5EA7] dark:text-[#C7AFFF]">Basic Information</h3>
              <div className="grid gap-6 mb-6">
                <ProfileSettingsForm form={form} onSubmit={onSubmit} isLoading={isLoading} />
              </div>

              {/* Email Verification Status */}
              <div className="mb-6">
                <div className="flex items-center gap-2 bg-[#F3F0FF] dark:bg-[#23223A] rounded-lg px-4 py-3 border-l-4 border-[#7B5EA7] dark:border-[#C7AFFF]">
                  <Mail className="h-5 w-5 text-[#7B5EA7] dark:text-[#C7AFFF]" />
                  <span className="font-medium text-[#7B5EA7] dark:text-[#C7AFFF]">Email Address</span>
                  <CheckCircle className="h-5 w-5 text-green-500 ml-2" />
                  <span className="ml-auto text-xs text-gray-500">✓ Verified</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 ml-1">Used for account notifications and recovery</div>
              </div>

              <div className="border-b border-dashed border-[#E5E5EF] dark:border-[#23223A] my-6" />

              {/* Security Section */}
              <h3 className="text-lg font-semibold mb-4 text-[#7B5EA7] dark:text-[#C7AFFF]">Security</h3>
              <div className="space-y-4 mb-6">
                {/* Current Password */}
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your current password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF]"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* New Password */}
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF]"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Confirm New Password */}
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF]"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-b border-dashed border-[#E5E5EF] dark:border-[#23223A] my-6" />

              {/* Account Management Section */}
              <h3 className="text-lg font-semibold mb-4 text-[#E58C5A] dark:text-[#E58C5A]">Account Management</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#F3F0FF] to-[#FAF7F8] dark:from-[#23223A] dark:to-[#18132A] rounded-lg p-4 border-l-4 border-[#E58C5A] dark:border-[#E58C5A]">
                  <h4 className="text-red-700 dark:text-red-400 font-semibold mb-2">Account Deletion</h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-0">
                    Deleting your account is permanent and cannot be undone. All your data will be lost.
                  </p>
                </div>
                <div className="flex items-center justify-center mt-4">
                  <DeactivateAccountDialog
                    deactivateForm={deactivateForm}
                    onDeactivate={onDeactivate}
                    isDeactivating={isDeactivating}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
