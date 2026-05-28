import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, PenSquare, User, UserRound } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useBalance } from "../../hooks/useBalance";
import { useUserActivity } from "../../hooks/useUserActivity";
import { getUserCountry, getCountryFlag } from "../../services/countryDetectionService";

const AVATAR_STORAGE_PREFIX = "ug_profile_avatar:";
const CONTACT_STORAGE_PREFIX = "ug_profile_contact:";
const WITHDRAW_STORAGE_PREFIX = "ug_profile_withdrawal:";

function contactKey(uid) {
  return `${CONTACT_STORAGE_PREFIX}${uid}`;
}

function withdrawKey(uid) {
  return `${WITHDRAW_STORAGE_PREFIX}${uid}`;
}

function emailLocalPart(email) {
  if (!email || typeof email !== "string") return "";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function formatJoined(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return String(iso);
  }
}

function roleLabel(role) {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === "admin") return "Admin";
  return "Investor";
}

function compressImageFile(file, maxWidth = 420, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function lockedInputClass() {
  return [
    "w-full rounded-lg px-3 py-2.5 text-sm text-slate-800",
    "bg-[#eaebf1] border-0 outline-none cursor-default",
    "pointer-events-none select-text",
  ].join(" ");
}

function editableInputClass(locked) {
  if (locked) return lockedInputClass();
  return [
    "w-full rounded-lg px-3 py-2.5 text-sm text-slate-800",
    "bg-[#f3f4f6] border border-slate-200/90 outline-none",
    "placeholder:text-slate-400",
    "focus:ring-2 focus:ring-amber-400/45 focus:border-amber-300/60",
  ].join(" ");
}

function FieldRow({ label, value, valueClassName = "" }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1 sm:gap-4 sm:items-center py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 shrink-0">
        {label}
      </span>
      <input
        type="text"
        readOnly
        tabIndex={-1}
        value={value}
        className={`${lockedInputClass()} ${valueClassName}`}
        aria-readonly="true"
      />
    </div>
  );
}

function EditableFieldRow({
  label,
  value,
  onChange,
  locked,
  placeholder = "",
  type = "text",
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1 sm:gap-4 sm:items-center py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 shrink-0">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        placeholder={placeholder}
        className={editableInputClass(locked)}
        aria-readonly={locked}
      />
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-3 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

function WithdrawalSectionTitle({ children }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#1a2b4b] mb-4 mt-8 first:mt-0">
      {children}
    </h3>
  );
}

function SaveEditBar({ locked, onSave, onEdit, saveLabel = "Save" }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {locked ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition"
        >
          Edit
        </button>
      ) : (
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition"
        >
          {saveLabel}
        </button>
      )}
    </div>
  );
}

/** Dashboard header avatar + dropdown (gradient header, menu links, sign out). */
export function DashboardProfileMenu({
  displayName,
  roleLabelText,
  initial,
  onSignOut,
  userImage,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const showName = displayName?.trim() || "User";
  const letter = String(initial ?? showName[0] ?? "U")
    .toUpperCase()
    .slice(0, 1);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-sm ring-2 ring-transparent transition hover:ring-orange-300/60 sm:h-10 sm:w-10 sm:text-sm overflow-hidden"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        {userImage ? (
          <img src={userImage} alt="User" className="h-full w-full object-cover" />
        ) : (
          letter
        )}
      </button>
      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(calc(100vw-1rem),280px)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-xl sm:top-[calc(100%+10px)]"
          role="menu"
        >
          <div
            className="absolute -top-2 right-5 z-10 h-0 w-0 border-x-[7px] border-x-transparent border-b-[8px] border-b-violet-600 drop-shadow-sm"
            aria-hidden
          />
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-600 to-violet-600 px-5 pb-6 pt-7 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-orange-500 text-2xl font-bold text-white shadow-md overflow-hidden">
              {userImage ? (
                <img src={userImage} alt="User" className="h-full w-full object-cover" />
              ) : (
                letter
              )}
            </div>
            <p className="mt-3 text-lg font-bold text-white">{showName}</p>
            <p className="text-sm font-normal text-white/90">{roleLabelText}</p>
          </div>
          <nav className="bg-white py-1">
            <Link
              to="/dashboard/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-medium text-[#1a2b4b] transition hover:bg-slate-50"
            >
              <User className="h-4 w-4 shrink-0" strokeWidth={2} />
              My Profile
            </Link>
            <Link
              to="/dashboard/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-medium text-[#1a2b4b] transition hover:bg-slate-50"
            >
              <PenSquare className="h-4 w-4 shrink-0" strokeWidth={2} />
              Edit Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut?.();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[#1a2b4b] transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
              Sign Out
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export default function Profile() {
  const fileInputId = useId();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const { balance, loading: balanceLoading } = useBalance();

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [role, setRole] = useState("user");
  const [meta, setMeta] = useState({});
  const [countryData, setCountryData] = useState(null);

  // Track user activity
  useUserActivity(userId);

  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLocked, setContactLocked] = useState(false);

  const [wAddress, setWAddress] = useState("");
  const [wNetwork, setWNetwork] = useState("");
  const [wMore, setWMore] = useState("");
  const [withdrawLocked, setWithdrawLocked] = useState(false);

  const loadAvatar = useCallback((uid) => {
    if (!uid || typeof window === "undefined") {
      setAvatarDataUrl(null);
      return;
    }
    try {
      const stored = window.localStorage.getItem(
        `${AVATAR_STORAGE_PREFIX}${uid}`,
      );
      setAvatarDataUrl(stored && stored.startsWith("data:") ? stored : null);
    } catch {
      setAvatarDataUrl(null);
    }
  }, []);

  function hydrateLocalProfile(uid, userMeta) {
    if (!uid || typeof window === "undefined") return;

    try {
      const rawContact = window.localStorage.getItem(contactKey(uid));
      if (rawContact) {
        const p = JSON.parse(rawContact);
        if (p && typeof p === "object") {
          setContactFirst(String(p.firstName ?? ""));
          setContactLast(String(p.lastName ?? ""));
          setContactPhone(String(p.phone ?? ""));
          setContactLocked(p.locked !== false);
        }
      } else {
        setContactLocked(false);
        setContactFirst(
          String(userMeta?.first_name ?? userMeta?.firstName ?? ""),
        );
        setContactLast(
          String(userMeta?.last_name ?? userMeta?.lastName ?? ""),
        );
        setContactPhone(
          String(userMeta?.phone ?? userMeta?.phone_number ?? ""),
        );
      }
    } catch {
      setContactLocked(false);
      setContactFirst(
        String(userMeta?.first_name ?? userMeta?.firstName ?? ""),
      );
      setContactLast(
        String(userMeta?.last_name ?? userMeta?.lastName ?? ""),
      );
      setContactPhone(
        String(userMeta?.phone ?? userMeta?.phone_number ?? ""),
      );
    }

    try {
      const rawW = window.localStorage.getItem(withdrawKey(uid));
      if (rawW) {
        const w = JSON.parse(rawW);
        if (w && typeof w === "object") {
          setWAddress(String(w.walletAddress ?? ""));
          setWNetwork(String(w.network ?? ""));
          setWMore(String(w.moreInfo ?? ""));
          setWithdrawLocked(w.locked !== false);
          return;
        }
      }
    } catch {
      /* fall through */
    }
    setWAddress("");
    setWNetwork("");
    setWMore("");
    setWithdrawLocked(false);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setError("");
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!mounted) return;

      if (!user?.id) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? null);
      const userMeta = user.user_metadata ?? {};
      setMeta(userMeta);

      loadAvatar(user.id);
      hydrateLocalProfile(user.id, userMeta);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, created_at, email, country_code, country_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profile?.role != null) setRole(profile.role);
      if (profile?.created_at) setCreatedAt(profile.created_at);

      // Load country data
      if (profile?.country_code) {
        setCountryData({
          countryCode: profile.country_code,
          countryName: profile.country_name,
        });
      } else {
        // Detect country if not set
        const detected = await getUserCountry(user.id);
        if (detected) {
          setCountryData(detected);
        }
      }

      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user?.id) {
        setUserId(null);
        setAvatarDataUrl(null);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? null);
      const userMeta = user.user_metadata ?? {};
      setMeta(userMeta);
      loadAvatar(user.id);
      hydrateLocalProfile(user.id, userMeta);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadAvatar]);

  const local = emailLocalPart(email);
  const username =
    meta.username ??
    meta.user_name ??
    meta.preferred_username ??
    (local || "—");

  const displayNameFromMeta =
    meta.full_name ??
    meta.name ??
    (username !== "—" ? username : local || "Member");

  const composedFromContact = [contactFirst, contactLast]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  const displayName =
    contactLocked && composedFromContact
      ? composedFromContact
      : displayNameFromMeta;

  const referralDisplay =
    meta.referral_code ??
    meta.referral_id ??
    (local || displayNameFromMeta || "—");

  const joined = formatJoined(createdAt);
  const initial =
    displayName.trim().charAt(0).toUpperCase() ||
    email.trim().charAt(0).toUpperCase() ||
    "U";

  function saveContactToStorage() {
    if (!userId) return;
    setError("");
    try {
      const payload = {
        firstName: contactFirst,
        lastName: contactLast,
        phone: contactPhone,
        locked: true,
      };
      window.localStorage.setItem(contactKey(userId), JSON.stringify(payload));
      setContactLocked(true);
    } catch {
      setError("Could not save contact info to this device.");
    }
  }

  function unlockContact() {
    setContactLocked(false);
  }

  function saveWithdrawToStorage() {
    if (!userId) return;
    setError("");
    try {
      const payload = {
        walletAddress: wAddress,
        network: wNetwork,
        moreInfo: wMore,
        locked: true,
      };
      window.localStorage.setItem(
        withdrawKey(userId),
        JSON.stringify(payload),
      );
      setWithdrawLocked(true);
    } catch {
      setError("Could not save withdrawal info to this device.");
    }
  }

  function unlockWithdraw() {
    setWithdrawLocked(false);
  }

  async function onPickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Image must be 8MB or smaller.");
      return;
    }
    setUploadError("");
    try {
      const dataUrl = await compressImageFile(file);
      window.localStorage.setItem(
        `${AVATAR_STORAGE_PREFIX}${userId}`,
        dataUrl,
      );
      setAvatarDataUrl(dataUrl);
    } catch (err) {
      const name = err && typeof err === "object" ? err.name : "";
      setUploadError(
        name === "QuotaExceededError"
          ? "Storage full — try a smaller image."
          : "Could not save image.",
      );
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/80 p-10 text-center text-slate-500 text-sm shadow-sm">
        Loading profile…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/80 p-10 text-center text-slate-600 text-sm shadow-sm">
        Sign in to view your profile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-500 font-medium">
        <Link
          to="/dashboard"
          className="text-slate-700 hover:text-slate-900 font-semibold"
        >
          Dashboard
        </Link>
        <span className="text-slate-400"> / </span>
        <span className="text-slate-500 lowercase">profile</span>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,340px)_1fr] gap-6 lg:gap-8 items-start">
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6 sm:p-8 will-change-auto">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-36 w-36 sm:h-40 sm:w-40 rounded-2xl overflow-hidden bg-amber-500 flex items-center justify-center shadow-inner ring-2 ring-amber-400/30">
                {avatarDataUrl ? (
                  <img
                    src={avatarDataUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-5xl sm:text-6xl font-bold text-white">
                    {initial}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPickAvatar}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 shadow-md transition"
              >
                Edit
              </button>
            </div>
            {uploadError ? (
              <p className="mt-3 text-xs text-red-600 text-center max-w-[240px]">
                {uploadError}
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-slate-400 text-center max-w-[240px]">
                Edit updates your photo only (saved on this device).
              </p>
            )}
          </div>

          <h2 className="mt-8 text-center text-xl font-bold text-slate-900 capitalize">
            {displayName}
          </h2>
          <p className="text-center text-sm text-slate-500 mt-1">
            {roleLabel(role)}
          </p>
          {countryData?.countryCode && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-2xl">{getCountryFlag(countryData.countryCode)}</span>
              <span className="text-sm text-slate-600">{countryData.countryName}</span>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-900">Bio</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Hi {displayName}, You joined this platform since {joined} and
              below is the information about your account and investment.
            </p>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl bg-emerald-50/80 border border-emerald-100/80 p-4">
            <div className="h-10 w-10 rounded-full bg-emerald-400/90 flex items-center justify-center shrink-0">
              <UserRound className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Net Worth</p>
              <p className="text-xs text-slate-600 mt-1">
                Your current worth is{" "}
                {balanceLoading ? (
                  <span className="font-semibold text-slate-400">Loading...</span>
                ) : (
                  <span className="font-semibold text-slate-900">
                    ${balance?.toLocaleString() ?? "0"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6 sm:p-8 min-h-[200px] will-change-auto">
          <SectionTitle>Referral ID</SectionTitle>
          <FieldRow
            label="Ref"
            value={referralDisplay}
            valueClassName="text-amber-600 font-semibold !bg-[#eaebf1]"
          />

          <SectionTitle>Personal information</SectionTitle>
          <FieldRow label="Email" value={email || "—"} />

          <SectionTitle>Name</SectionTitle>
          <FieldRow label="User Name" value={username} />
          <EditableFieldRow
            label="First Name"
            value={contactFirst}
            onChange={setContactFirst}
            locked={contactLocked}
            placeholder="First name"
          />
          <EditableFieldRow
            label="last Name"
            value={contactLast}
            onChange={setContactLast}
            locked={contactLocked}
            placeholder="Last name"
          />

          <SectionTitle>Contact info</SectionTitle>
          <EditableFieldRow
            label="Phone"
            value={contactPhone}
            onChange={setContactPhone}
            locked={contactLocked}
            placeholder="Phone number"
            type="tel"
          />
          <SaveEditBar
            locked={contactLocked}
            onSave={saveContactToStorage}
            onEdit={unlockContact}
          />

          <WithdrawalSectionTitle>Withdrawal info</WithdrawalSectionTitle>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1 sm:gap-4 sm:items-start">
              <span className="text-sm text-slate-500 pt-2.5 shrink-0">
                Wallet Address
              </span>
              <input
                type="text"
                value={wAddress}
                onChange={(e) => setWAddress(e.target.value)}
                readOnly={withdrawLocked}
                placeholder="Your wallet address"
                className={editableInputClass(withdrawLocked)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1 sm:gap-4 sm:items-start">
              <span className="text-sm text-slate-500 pt-2.5 shrink-0">
                Network
              </span>
              <input
                type="text"
                value={wNetwork}
                onChange={(e) => setWNetwork(e.target.value)}
                readOnly={withdrawLocked}
                placeholder="Example: ERC20"
                className={editableInputClass(withdrawLocked)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1 sm:gap-4 sm:items-start">
              <span className="text-sm text-slate-500 pt-2.5 shrink-0">
                More Info
              </span>
              <textarea
                value={wMore}
                onChange={(e) => setWMore(e.target.value)}
                readOnly={withdrawLocked}
                rows={4}
                placeholder="More info about Withdrawal wallet if available"
                className={`${editableInputClass(withdrawLocked)} min-h-[100px] ${withdrawLocked ? "resize-none" : "resize-y"}`}
              />
            </div>
          </div>

          <SaveEditBar
            locked={withdrawLocked}
            onSave={saveWithdrawToStorage}
            onEdit={unlockWithdraw}
          />
        </div>
      </div>
    </div>
  );
}
