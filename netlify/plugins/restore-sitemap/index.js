const fs = require('fs');
const path = require('path');

module.exports = {
  onPostBuild: ({ constants, utils }) => {
    const src = path.resolve('public', 'sitemap.xml');
    const dest = path.join(constants.PUBLISH_DIR, 'sitemap.xml');

    if (!fs.existsSync(src)) {
      utils.build.failBuild('public/sitemap.xml not found');
      return;
    }

    fs.copyFileSync(src, dest);
    console.log('[restore-sitemap] Restored public/sitemap.xml → ' + dest);
  },
};
