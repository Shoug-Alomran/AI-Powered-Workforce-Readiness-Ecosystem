import { updateProfileImage } from "@/actions/account";

export default function ProfileImageForm() {
  return <form action={updateProfileImage} className="profile-image-form"><label>Profile image<input type="file" name="profileImage" accept="image/jpeg,image/png,image/webp,image/gif" required/><small>JPG, PNG, WebP, or GIF · maximum 5 MB.</small></label><button className="button secondary">Upload image</button></form>;
}
