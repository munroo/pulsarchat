export async function handleShare(title, text, url, showToast) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // User cancelled — that's fine
    }
  } else {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    if (showToast) showToast("copied to clipboard!");
  }
}
