// Thin red bar on top of results that are being refreshed, so old results never look final.
export function LoadingBar() {
  return <div className="loading-bar" data-testid="loading-bar" role="progressbar" aria-label="Loading" />
}
