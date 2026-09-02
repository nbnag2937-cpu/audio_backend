const { fetchOgImage } = require("../dist/modules/ogPreview/ogPreview.service");

fetchOgImage("https://shopee.vn/product/729014007/52460495899")
  .then((r) => console.log(r))
  .catch((e) => console.error(e));
