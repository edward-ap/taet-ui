/**
 * Traverse every native control without changing the user's keyboard settings.
 * macOS WebKit defaults to skipping buttons with Tab; Option+Tab includes them.
 * Use only for browser-owned navigation. Library Tab handling (editors, modal
 * containment) must keep exercising plain Tab/Shift+Tab.
 */
export async function pressNativeTab(page, { backward = false } = {}) {
  const webkitOnMac = process.platform === 'darwin'
    && page.context().browser()?.browserType().name() === 'webkit';
  await page.keyboard.press(`${webkitOnMac ? 'Alt+' : ''}${backward ? 'Shift+' : ''}Tab`);
}
