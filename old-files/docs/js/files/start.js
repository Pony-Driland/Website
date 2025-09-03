if (puddyWeb3.existAccounts()) {
  metaLogin.title = puddyWeb3.getAddress();
}
puddyWeb3.waitReadyProvider().then().catch(startApp);


// Meta Login
const metaLogin = {
  base: TinyHtml.createFrom('li', { class: 'nav-item font-weight-bold' }),
  title: 'Login',
};

metaLogin.button = tinyLib.bs
  .button({ dsBtn: true, id: 'login', class: 'nav-link web3-element' })
  .attr('title', metaLogin.title)
  .prepend(tinyLib.icon('fa-brands fa-ethereum me-2'));

metaLogin.base.prepend(metaLogin.button);
metaLogin.button.on('click', storyCfg.web3.login);


metaLogin.button.tooltip();
metaLogin.base;