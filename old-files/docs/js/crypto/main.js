// Start Web3
const puddyWeb3 = new PuddyWeb3('matic');

// Accounts Changed
puddyWeb3.on('accountsChanged', (data) => {
  // Get Address
  const address = puddyWeb3.getAddress();
  console.log('Web3 Connected', address, data);
});

// Network Changed
puddyWeb3.on('networkChanged', (networkId) => {
  console.log('Web3 Network Connected', networkId);
});

puddyWeb3.on('network', (newNetwork, oldNetwork) => {
  console.log('Web3 Network Connected', newNetwork, oldNetwork);
});

// Connection Update
puddyWeb3.on('connectionUpdate', (trigger) => {
  // Get Address
  const address = puddyWeb3.getAddress();

  // Console
  console.log('Web3 Account (' + trigger + ')', address);

  // Update CSS and remove modal
  $('#crypto_connection').modal('hide');
  $('body').addClass('web3-connected');

  // Change Title
  if (address) {
    $('#login').data('bs-tooltip-data', address);

    const tooltip = $('#login').data('bs-tooltip');
    if (tooltip) {
      tooltip.setContent({ '.tooltip-inner': address });
    }
  }
});

// Login
storyCfg.web3.login = () => {
  // Login Mode
  if (!puddyWeb3.existAccounts()) {
    tinyLib.modal({
      id: 'crypto_connection',
      title: 'Login Protocol',
      body: $('<center>').append(
        $('<p>').text(
          `Login is not required. You can continue using all the tools of the website for free. Login is only to use cloud services.`,
        ),

        tinyLib.bs
          .button('info m-4')
          .text('Metamask')
          .on('click', () => {
            $('#crypto_connection').modal('hide');
            puddyWeb3.alertIsEnabled();
            if (puddyWeb3.isEnabled()) {
              puddyWeb3
                .sign()
                .then(async () => {
                  $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
                  await puddyWeb3.requestAccounts();
                  window.location.reload();
                })
                .catch((err) => {
                  alert(err.message);
                  console.error(err);
                });
            }
          }),
      ),
    });
  }

  // Panel
  else {
    const checkPanelActive = () => {
      return new Promise((resolve, reject) => {
        storyCfg.web3.contract
          .enabled(puddyWeb3.getAddress())
          .then((isEnabled) => {
            // Get Value
            isEnabled = puddyWeb3.parseToSimpleInt(isEnabled);

            // Enabled
            if (isEnabled) {
              resolve(true);
            }

            // Nope
            else {
              alert(
                `Your website account is not active on the blockchain. This transaction will activate your account.`,
              );
              storyCfg.web3.contract
                .enable()
                .then((data) => {
                  reject(
                    new Error(
                      `Blockchain Storage (BETA) ${puddyWeb3.getBlockchain().chainName} - Your website account is being activated! Wait a while for the blockchain to finish processing your order. \n\nHash: ${data.hash}`,
                    ),
                  );
                })
                .catch((err) => {
                  alert(err.message);
                  console.error(err);
                });
            }
          })
          .catch(reject);
      });
    };

    // Prepare Items
    const modalTitle =
      'Choose what kind of data you want to interact within the blockchain. Please make sure you are in the correct domain.';
    const modalWarn = $('<strong>', { class: 'ms-1' }).text(
      'We only work on the domain ' + storyCfg.domain + '!',
    );
    const items = [];
    const itemsData = {};
    let clickType = null;
    let clickType2 = null;

    // NSFW Filter
    itemsData.nsfwFilter = tinyLib.bs
      .button('secondary m-2')
      .text('NSFW Filters')
      .on('click', function () {
        const filters = [];
        const nsfwList = [];
        for (const fic in storyData.data) {
          for (const item in storyData.data[fic]) {
            if (storyData.data[fic][item].nsfw) {
              for (const nsfwItem in storyData.data[fic][item].nsfw) {
                if (nsfwList.indexOf(storyData.data[fic][item].nsfw[nsfwItem]) < 0) {
                  // Add Item
                  const NSFWITEM = storyData.data[fic][item].nsfw[nsfwItem];
                  nsfwList.push(NSFWITEM);

                  // Add NSFW Item
                  if (storyCfg.nsfw[NSFWITEM]) {
                    // Action
                    filters.push(
                      tinyLib.bs
                        .button('secondary m-2')
                        .data('nsfw_crypto_data', { id: NSFWITEM, data: storyCfg.nsfw[NSFWITEM] })
                        .text(storyCfg.nsfw[NSFWITEM].name)
                        .on('click', async function () {
                          const tinyThis = this;
                          $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
                          await puddyWeb3.requestAccounts();
                          $.LoadingOverlay('hide');
                          if (clickType === 'save') {
                            checkPanelActive()
                              .then(() => {
                                let setValue = 0;
                                const nsfwID = $(tinyThis).data('nsfw_crypto_data').id;
                                if (typeof nsfwID === 'string' && nsfwID.length > 0) {
                                  const value = localStorage.getItem('NSFW' + nsfwID);
                                  if (value === 'true') {
                                    setValue = 1;
                                  }

                                  storyCfg.web3.contract
                                    .changeNsfwFilter(nsfwID, setValue)
                                    .then((data) => {
                                      alert(
                                        `Blockchain Storage (BETA) ${puddyWeb3.getBlockchain().chainName} - You set the NSFW Filter ${nsfwID} to ${setValue}!\n\nHash: ${data.hash}`,
                                      );
                                    })
                                    .catch((err) => {
                                      alert(err.message);
                                      console.error(err);
                                    });
                                }
                              })
                              .catch((err) => {
                                alert(err.message);
                                console.error(err);
                              });
                          } else if (clickType === 'load') {
                            const nsfwID = $(this).data('nsfw_crypto_data').id;

                            storyCfg.web3.contract
                              .getNsfwFilter(puddyWeb3.getAddress(), nsfwID)
                              .then((data) => {
                                data = puddyWeb3.parseToSimpleInt(data);
                                if (
                                  typeof data === 'number' &&
                                  !isNaN(data) &&
                                  isFinite(data) &&
                                  data > -1
                                ) {
                                  if (data) {
                                    localStorage.setItem('NSFW' + nsfwID, true);
                                  } else {
                                    localStorage.setItem('NSFW' + nsfwID, false);
                                  }

                                  alert(
                                    'The NSFW ' +
                                      nsfwID +
                                      ' setting was downloaded from the blockchain successfully.\nValue: ' +
                                      String(data),
                                  );

                                  if (storyData.readFic) {
                                    $('#fic-start').trigger('click');
                                  }
                                }
                              })
                              .catch((err) => {
                                alert(err.message);
                                console.error(err);
                              });
                          }

                          $('#crypto_connection3').modal('hide');
                          return;
                        }),
                    );
                  }
                }
              }
            }
          }
        }

        $('#crypto_connection2').modal('hide');
        tinyLib.modal({
          id: 'crypto_connection3',
          title:
            'Blockchain Storage (BETA) ' + puddyWeb3.getBlockchain().chainName + ' - ' + clickType2,
          dialog: 'modal-lg',
          body: $('<center>').append(
            $('<div>').text('Choose which filter you want to interact with.'),
            filters,
          ),
        });
      });

    items.push(itemsData.nsfwFilter);

    // Volume
    itemsData.volume = tinyLib.bs
      .button('secondary m-2')
      .text('Volume')
      .on('click', async () => {
        $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
        await puddyWeb3.requestAccounts();
        $.LoadingOverlay('hide');
        if (clickType === 'save') {
          checkPanelActive()
            .then(() => {
              const volume = Number(localStorage.getItem('storyVolume'));

              if (
                typeof volume === 'number' &&
                !isNaN(volume) &&
                isFinite(volume) &&
                volume >= 0 &&
                volume <= 100
              ) {
                storyCfg.web3.contract
                  .setVolume(volume)
                  .then((data) => {
                    alert(
                      `Blockchain Storage (BETA) ${puddyWeb3.getBlockchain().chainName} - You set the volume to ${volume}!\n\nHash: ${data.hash}`,
                    );
                  })
                  .catch((err) => {
                    alert(err.message);
                    console.error(err);
                  });
              }
            })
            .catch((err) => {
              alert(err.message);
              console.error(err);
            });
        } else if (clickType === 'load') {
          storyCfg.web3.contract
            .getVolume(puddyWeb3.getAddress())
            .then((data) => {
              data = puddyWeb3.parseToSimpleInt(data);
              if (typeof data === 'number' && !isNaN(data) && isFinite(data) && data > -1) {
                localStorage.setItem('storyVolume', data);
                if (
                  storyData.readFic &&
                  storyData &&
                  storyData.youtube &&
                  typeof storyData.youtube.setVolume === 'function'
                ) {
                  storyData.youtube.setVolume(data);
                }

                alert(
                  'The volume setting was downloaded from the blockchain successfully.\nValue: ' +
                    String(data),
                );
              }
            })
            .catch((err) => {
              alert(err.message);
              console.error(err);
            });
        }

        $('#crypto_connection2').modal('hide');
        return;
      });

    items.push(itemsData.volume);

    // Chapter Selected
    if (storyData.chapter.selected > 0) {
      // Bookmark
      itemsData.bookmark = tinyLib.bs
        .button('secondary m-2')
        .text('Bookmark - Chapter ' + storyData.chapter.selected)
        .on('click', async () => {
          $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
          await puddyWeb3.requestAccounts();
          $.LoadingOverlay('hide');

          if (
            typeof storyData.chapter.selected === 'number' &&
            !isNaN(storyData.chapter.selected) &&
            isFinite(storyData.chapter.selected) &&
            storyData.chapter.selected > 0
          ) {
            if (clickType === 'save') {
              checkPanelActive()
                .then(() => {
                  const setValue = Number(
                    localStorage.getItem('bookmark' + String(storyData.chapter.selected)),
                  );
                  if (
                    typeof setValue === 'number' &&
                    !isNaN(setValue) &&
                    isFinite(setValue) &&
                    setValue >= 0
                  ) {
                    storyCfg.web3.contract
                      .insertBookmark(storyData.chapter.selected, setValue)
                      .then((data) => {
                        alert(
                          `Blockchain Storage (BETA) ${puddyWeb3.getBlockchain().chainName} - You set the Bookmark from chapter ${storyData.chapter.selected} to ${setValue}!\n\nHash: ${data.hash}`,
                        );
                      })
                      .catch((err) => {
                        alert(err.message);
                        console.error(err);
                      });
                  }
                })
                .catch((err) => {
                  alert(err.message);
                  console.error(err);
                });
            } else if (clickType === 'load') {
              storyCfg.web3.contract
                .getBookmark(puddyWeb3.getAddress(), storyData.chapter.selected)
                .then((data) => {
                  data = puddyWeb3.parseToSimpleInt(data);
                  if (typeof data === 'number' && !isNaN(data) && isFinite(data) && data > -1) {
                    localStorage.setItem('bookmark' + storyData.chapter.selected, data);
                    storyData.chapter.bookmark[storyData.chapter.selected] = data;

                    alert(
                      'The Bookmark Chapter ' +
                        storyData.chapter.selected +
                        ' setting was downloaded from the blockchain successfully.\nValue: ' +
                        String(data),
                    );

                    if (storyData.readFic) {
                      $('#fic-start').trigger('click');
                    }
                  }
                })
                .catch((err) => {
                  alert(err.message);
                  console.error(err);
                });
            }
          }

          $('#crypto_connection2').modal('hide');
          return;
        });

      items.push(itemsData.bookmark);
    }

    // The Modal
    tinyLib.modal({
      id: 'crypto_connection',
      title: 'Blockchain Storage (BETA) ' + puddyWeb3.getBlockchain().chainName,
      dialog: 'modal-lg',
      body: $('<center>').append(
        $('<div>').append(
          $('<p>').text(
            'This is your cloud storage. Choose what you want to do. All your data is saved inside the blockchain publicly. Any user can see your data in a blockchain explorer.',
          ),
          $('<small>').append(
            $('<a>', {
              href: `${puddyWeb3.getBlockchain().blockExplorerUrls}address/${storyCfg.web3.contractAddress}`,
              target: '_blank',
            }).text(storyCfg.web3.contractAddress),
          ),
        ),

        // Load
        tinyLib.bs
          .button('secondary m-4')
          .text('Load')
          .on('click', () => {
            clickType = 'load';
            clickType2 = 'Load';
            $('#crypto_connection').modal('hide');
            tinyLib.modal({
              id: 'crypto_connection2',
              title:
                'Blockchain Storage (BETA) ' +
                puddyWeb3.getBlockchain().chainName +
                ' - ' +
                clickType2,
              dialog: 'modal-lg',
              body: $('<center>').append($('<div>').text(modalTitle).append(modalWarn), items),
            });
          }),

        // Save
        tinyLib.bs
          .button('primary m-4')
          .text('Save')
          .on('click', () => {
            clickType = 'save';
            clickType2 = 'Save';
            $('#crypto_connection').modal('hide');
            tinyLib.modal({
              id: 'crypto_connection2',
              title:
                'Blockchain Storage (BETA) ' +
                puddyWeb3.getBlockchain().chainName +
                ' - ' +
                clickType2,
              dialog: 'modal-lg',
              body: $('<center>').append($('<div>').text(modalTitle).append(modalWarn), items),
            });
          }),
      ),
    });
  }

  return false;
};

// Connection Update
puddyWeb3.on('signerUpdated', (signer) => {
  storyCfg.web3.contract = new ethers.Contract(
    storyCfg.web3.contractAddress,
    storyCfg.web3.abi.base,
    signer,
  );
});

puddyWeb3.waitAddress().then(() => {
  puddyWeb3.requestAccounts(false);
});
