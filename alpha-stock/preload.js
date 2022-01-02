const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const fs = require('fs');
const qz = require('qz-tray');
const moment = require('jalali-moment');

class PageState {
  constructor() {
    this.currentState = new HomeState(this);

    // Event listners
    document.querySelector('#home').addEventListener('click', (e) => {
      this.change(new HomeState(this));
      e.preventDefault();
    });
  }
  change(state) {
    this.currentState = state;
  }
}
class HomeState {
  constructor(page) {
    document.querySelector('#content').innerHTML = `
    <div class="container">
        <div class="row">
            <div class="col-lg-6 mx-auto">
                <div class="d-grid gap-2 rtl">
                    <button class="btn btn-lg btn-outline-dark m-2" type="button" id="order"><p class="persian inline m-0"><i class='fas fa-shopping-cart'></i>  ثبت سفارش جدید</p></button>
                    <hr>
                    <button class="btn btn-lg btn-outline-warning m-2 disabled" type="button" id="website"><p class="persian inline m-0"><i class='fas fa-server'></i>  سفارش های انلاین</p></button>
                    <hr>
                    <button class="btn btn-lg btn-outline-success m-2" type="button" id="add"><p class="persian inline m-0"><i class='fas fa-plus'></i>  اضافه کردن محصول</p></button>
                    <button class="btn btn-lg btn-outline-success m-2 disabled" type="button" id="barcode"><p class="persian inline m-0"><i class='fas fa-barcode'></i>  بارکد ساز</p></button>
                    <hr>
                    <button class="btn btn-lg btn-outline-info m-2 disabled" type="button" id="db"><p class="persian inline m-0"><i class='fas fa-archive'></i>  تاریخچه سفارشات</p></button>
                </div>
            </div>
        </div>
    </div>
    `;

    // Event listners
    document.querySelector('#order').addEventListener('click', (e) => {
      page.change(new OrderState(page));
      e.preventDefault();
    });
    document.querySelector('#db').addEventListener('click', (e) => {
      page.change(new DBState(page));
      e.preventDefault();
    });
    document.querySelector('#add').addEventListener('click', (e) => {
      page.change(new AddState(page));
      e.preventDefault();
    });
  }
}
class OrderState {
  constructor(page) {
    document.querySelector('#content').innerHTML = `
    <table class="table table-hover text-center persian table-bordered table-sm align-middle"
        style="font-size: 14px" id="table">
        <thead>
            <tr class="table-dark">
                <th scope="col">ردیف</th>
                <th scope="col">تصویر محصول</th>
                <th scope="col">محصول</th>
                <th scope="col">قیمت واحد</th>
                <th scope="col">تعداد</th>
                <th scope="col">قیمت کل</th>
                <th scope="col">تخفیف</th>
            </tr>
        </thead>
        <tbody class="table-light" id="order-list">
        </tbody>
        <tfoot class="table-primary" id="table-footer">
            <td colspan="6">
                <table class="table table-sm mb-0 table-light">
                    <tbody id="total-table">
                    </tbody>
                </table>
            </td>
            <td>
              <form id="total-form">
                <div class="form-group">
                    <div class="input-group max" style="border: dotted; border-color: lightgray">
                        <input type="text" class="form-control form-control-sm" id="total-offer-amount" value="0" />
                        <select class="form-select form-select-sm" id="total-offer-type" style="padding: 0.5rem">
                            <option value="tomaan">تومان</option>
                            <option value="darsad" selected>درصد</option>
                        </select>
                        <span style="padding: 0.5rem; background-color: #f7f7f9">تخفیف بر جمع کل</span>
                    </div>
                </div>
              </form>
            </td>
        </tfoot>
    </table>
    <div class="row mb-3" id="order-buttons">
        <div class="col-4 d-grid">
            <button type="button" class="btn btn-outline-warning" id="clear">
                <i class='fas fa-eraser'></i>
                پاک کردن لیست
            </button>
        </div>
        <div class="col-8 d-grid">
            <button type="button" class="btn btn-primary" id="finish">
                اتمام خرید
                <i class='fas fa-chevron-circle-left'></i>
            </button>
        </div>
    </div>
    `;
    this.order = new Order();

    // Event listners
    // Instead of barcode scanner trigger event
    let barcode = '';
    document.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        if (barcode.startsWith('prod-')) {
          await this.order.addItem(barcode);
        }
        barcode = '';
      } else {
        barcode += e.key;
      }
    });
    document.querySelector('#total-form').addEventListener('change', (e) => {
      let amount = document.querySelector(`#total-offer-amount`).value;
      let type = document.querySelector(`#total-offer-type`).value;
      let valid = function (check, order) {
        if (check) {
          document
            .querySelector(`#total-offer-amount`)
            .classList.remove('is-invalid');
          order.updateTotalOffer({
            amount,
            type,
          });
        } else {
          document
            .querySelector(`#total-offer-amount`)
            .classList.add('is-invalid');
        }
      };
      if (type === 'darsad') {
        if (!isNaN(+amount) && amount <= 100) {
          valid(true, this.order);
        } else {
          valid(false);
        }
      } else if (type === 'tomaan') {
        if (!isNaN(+amount)) {
          valid(true, this.order);
        } else {
          valid(false);
        }
      }
    });
    document.querySelector('#total-form').addEventListener('submit', (e) => {
      e.preventDefault();
    });
    document.querySelector('#clear').addEventListener('click', (e) => {
      this.order.clear();
      e.preventDefault();
    });
    document.querySelector('#finish').addEventListener('click', async (e) => {
      await this.order.finish();
      e.preventDefault();
    });
  }
}
class DBState {}
class AddState {
  constructor() {
    this.api = new WooCommerceRestApi({
      url: 'https://www.alpha-stock.com/',
      consumerKey: 'ck_26ccbb0e20a8ad26a023fe56a9331312ac86149c',
      consumerSecret: 'cs_35c1b82c8bb01feb21d4783c934daded875ad23d',
    });
    this.ui = new UI();
    this.attr = [];
    (async () => {
      $('#content').LoadingOverlay('show');
      try {
        let response = await this.api.get('products/attributes');
        response.data.forEach((i) => {
          this.attr.push({ name: i.name, id: i.id, slug: i.slug, terms: [] });
        });
        for (let i of this.attr) {
          let response = await this.api.get(
            `products/attributes/${i.id}/terms`,
            {
              per_page: 100,
            }
          );
          response.data.forEach((ii) => {
            i.terms.push({ name: ii.name, id: ii.id, slug: ii.slug });
          });
        }
      } catch (e) {
        fs.appendFileSync('./error.log', `[${new Date()}] ${e.toString()}\n`);
        this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
      }

      $('#content').LoadingOverlay('hide');
    })();
    document.querySelector('#content').innerHTML = `
    <div class="container">
      <div class="card border-primary mb-3">
        <div class="card-header">
          <select class="form-select" id="add-select">
            <option value="select" selected>انتخاب کنید...</option>
            <option value="taki">محصول تکی</option>
            <option value="paki">محصول متغیر</option>
          </select>
        </div>
        <div class="card-body" id="card-body">
          <p class="persian" style="text-align:center;">نوع محصول را مشخص کنید!</p>
        </div>
      </div>
    </div>
    `;
    document
      .querySelector('#add-select')
      .addEventListener('change', async (e) => {
        if (e.target.value === 'taki') {
          let html = `
          <form id="frm">
            <div class="form-group row m-3">
              <label for="name" class="col-sm-2 col-form-label">نام محصول</label>
              <div class="col-sm-10">
                <input name="name" type="text" class="form-control border-2" id="name">
              </div>
            </div>
            <div class="form-group row m-3">
              <label for="barcode" class="col-sm-2 col-form-label">بارکد</label>
              <div class="col-sm-10">
                <input name="sku" type="text" class="form-control border-2" id="barcode">
              </div>
            </div>
            <div class="form-group row m-3">
              <label for="count" class="col-sm-2 col-form-label">تعداد</label>
              <div class="col-sm-10">
                <input name="stock_quantity" type="number" value="1" class="form-control border-2" id="name">
              </div>
            </div>
            <div class="form-group row m-3">
              <label for="price" class="col-sm-2 col-form-label">قیمت</label>
              <div class="col-sm-10">
                <input name="regular_price" type="number" class="form-control border-2" id="name">
              </div>
            </div>
            <div class="form-group row m-3">
              <label for="group" class="col-sm-2 col-form-label">ویژگی محصول</label>
              <ul class="list-group col-sm-10" style="padding-left:12px;" id="group">
                <li class="list-group-item">
                  <div class="form-group row">
                    <label for="brand" class="col-sm-2 col-form-label">برند</label>
                    <div class="col-sm-10">
                      <select class="form-select" id="brand" name="pa_brand" form="frm">
                        <option value='nothing' selected>هیچکدام</option>`;
          this.attr
            .find((e) => e.slug === 'pa_brand')
            ['terms'].forEach((i) => (html += `<option>${i.name}</option>`));
          html += `
                      </select>
                    </div>
                  </div>
                </li>
                <li class="list-group-item">
                  <div class="form-group row">
                    <label for="size" class="col-sm-2 col-form-label">سایز</label>
                    <div class="col-sm-10">
                      <select class="form-select" id="size" name="pa_size" form="frm">
                        <option value='nothing' selected>هیچکدام</option>`;
          this.attr
            .find((e) => e.slug === 'pa_size')
            ['terms'].forEach((i) => (html += `<option>${i.name}</option>`));
          html += `
                      </select>
                    </div>
                  </div>
                </li>
                <li class="list-group-item">
                  <div class="form-group row">
                    <label for="color" class="col-sm-2 col-form-label">رنگ</label>
                    <div class="col-sm-10">
                      <select class="form-select" id="color" name="pa_color" form="frm">
                        <option value='nothing' selected>هیچکدام</option>`;
          this.attr
            .find((e) => e.slug === 'pa_color')
            ['terms'].forEach((i) => (html += `<option>${i.name}</option>`));
          html += `
                      </select>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div class="row mb-3" id="order-buttons">
              <div class="col-4 d-grid">
                  <button type="button" class="btn btn-outline-warning" id="clear">
                      <i class='fas fa-eraser'></i>
                      پاک کردن
                  </button>
              </div>
              <div class="col-8 d-grid">
                <button type="button" class="btn btn-success" id="taki-form">ثبت کردن محصول</button>
              </div>
            </div>
          </form>
          `;
          document.querySelector('#card-body').innerHTML = html;
          document.querySelector('#frm').addEventListener('submit', (e) => {
            e.preventDefault();
          });
          document
            .querySelector('#taki-form')
            .addEventListener('click', async (e) => {
              $('#card-body').LoadingOverlay('show');
              let formData = new FormData(document.querySelector('#frm'));
              let obj = {
                type: 'simple',
                status: 'draft',
                manage_stock: true,
                attributes: [],
              };
              for (const pair of formData.entries()) {
                if (pair[0].startsWith('pa_')) {
                  if (pair[1] === 'nothing') continue;
                  switch (pair[0]) {
                    case 'pa_brand':
                      obj['attributes'].push({
                        id: this.attr.find((e) => e.slug === pair[0]).id,
                        options: [pair[1]],
                        visible: true,
                      });
                      break;
                    case 'pa_color':
                      obj['attributes'].push({
                        id: this.attr.find((e) => e.slug === pair[0]).id,
                        options: [pair[1]],
                        visible: true,
                      });
                      break;
                    case 'pa_size':
                      obj['attributes'].push({
                        id: this.attr.find((e) => e.slug === pair[0]).id,
                        options: [pair[1]],
                        visible: true,
                      });
                      break;
                  }
                } else {
                  obj[pair[0]] = pair[1];
                }
              }
              try {
                let res = await this.api.post('products', obj);
                if (res.status === 201) {
                  this.ui.showAlert(
                    'محصول با موفقیت اضافه شد',
                    'alert-success'
                  );
                  document.querySelector('#frm').reset();
                } else {
                  this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
                }
              } catch (e) {
                fs.appendFileSync(
                  './error.log',
                  `[${new Date()}] ${e.toString()}\n`
                );
                this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
              }
              $('#card-body').LoadingOverlay('hide');
              e.preventDefault();
            });
          document.querySelector('#clear').addEventListener('click', (e) => {
            document.querySelector('#frm').reset();
            e.preventDefault();
          });
        } else if (e.target.value === 'paki') {
          let html = `
          <form id="frm">
            <div class="form-group row m-3">
              <label for="name" class="col-sm-2 col-form-label">نام محصول</label>
              <div class="col-sm-10">
                <input name="name" type="text" class="form-control border-2" id="name">
              </div>
            </div>
            <div class="form-group row m-3">
              <label for="price" class="col-sm-2 col-form-label">قیمت</label>
              <div class="col-sm-10">
                <input name="regular_price" type="number" class="form-control border-2" id="name">
              </div>
            </div>
            <div class="form-group row m-3">
              <label for="brand" class="col-sm-2 col-form-label">برند</label>
              <div class="col-sm-10">
                <select class="form-select" id="brand" name="pa_brand" form="frm">
                  <option value='nothing' selected>هیچکدام</option>`;
          this.attr
            .find((e) => e.slug === 'pa_brand')
            ['terms'].forEach((i) => (html += `<option>${i.name}</option>`));
          html += `
                </select>
              </div>
            </div>
            <div class="form-group row m-3">
              <label for="group" class="col-sm-2 col-form-label">متغییرها</label>
              <div class="col-sm-10">
                <ul class="list-group" id="group" style="padding:0;">
                </ul>
                <div class="row d-grid m-3">
                  <button type="button" class="btn btn-outline-secondary" id="add-variante">
                      <i class='fas fa-plus'></i>
                      اضافه کردن متغییر
                  </button>
                </div>
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-4 d-grid">
                  <button type="button" class="btn btn-outline-warning" id="clear">
                      <i class='fas fa-eraser'></i>
                      پاک کردن
                  </button>
              </div>
              <div class="col-8 d-grid">
                <button type="button" class="btn btn-success" id="paki-form">ثبت محصول</button>
              </div>
            </div>
          </form>
          `;
          document.querySelector('#card-body').innerHTML = html;
          let num = -1;
          document.querySelector('#frm').addEventListener('submit', (e) => {
            e.preventDefault();
          });
          document
            .querySelector('#add-variante')
            .addEventListener('click', (e) => {
              num++;
              let html;
              html = `
              <li class="list-group-item">
                <div class="form-group row m-2">
                  <label for="var${num}-barcode" class="col-sm-2 col-form-label">بارکد</label>
                  <div class="col-sm-10">
                    <input name="var${num}-sku" type="text" class="form-control border-2" id="var${num}-barcode">
                  </div>
                </div>
                <div class="form-group row m-2">
                  <label for="var${num}-count" class="col-sm-2 col-form-label">تعداد</label>
                  <div class="col-sm-10">
                    <input name="var${num}-stock_quantity" type="number" value="1" class="form-control border-2" id="var${num}-name">
                  </div>
                </div>
                <div class="form-group row m-2">
                  <label for="group" class="col-sm-2 col-form-label">ویژگی محصول</label>
                  <ul class="list-group col-sm-10" style="padding-left:12px;" id="group">
                    <li class="list-group-item">
                    <div class="form-group row">
                      <label for="var${num}-size" class="col-sm-2 col-form-label">سایز</label>
                      <div class="col-sm-10">
                        <select class="form-select" id="var${num}-size" name="var${num}-pa_size" form="frm">
                          <option value='nothing' selected>هیچکدام</option>`;
              this.attr
                .find((e) => e.slug === 'pa_size')
                ['terms'].forEach(
                  (i) => (html += `<option>${i.name}</option>`)
                );
              html += `
                          </select>
                        </div>
                      </div>
                    </li>
                    <li class="list-group-item">
                      <div class="form-group row">
                        <label for="var${num}-color" class="col-sm-2 col-form-label">رنگ</label>
                        <div class="col-sm-10">
                          <select class="form-select" id="var${num}-color" name="var${num}-pa_color" form="frm">
                            <option value='nothing' selected>هیچکدام</option>`;
              this.attr
                .find((e) => e.slug === 'pa_color')
                ['terms'].forEach(
                  (i) => (html += `<option>${i.name}</option>`)
                );
              html += `
                          </select>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </li>
              `;
              //document.querySelector('#group').innerHTML += html;
              document
                .querySelector('#group')
                .insertAdjacentHTML('beforeend', html);
              window.scrollTo(0, document.body.scrollHeight);
              e.preventDefault();
            });
          document
            .querySelector('#paki-form')
            .addEventListener('click', async (e) => {
              let formData = new FormData(document.querySelector('#frm'));
              let obj = {
                first: { type: 'variable', status: 'draft', attributes: [] },
                later: { create: [] },
              };
              for (let i = 0; i <= num; i++)
                obj.later.create.push({
                  regular_price: formData.get('regular_price'),
                  manage_stock: true,
                  stock_quantity: 1,
                  attributes: [],
                });
              formData.delete('regular_price');
              for (const pair of formData.entries()) {
                if (pair[0].startsWith('var')) {
                  for (let i = 0; i <= num; i++) {
                    if (pair[0].startsWith(`var${i}-`)) {
                      if (pair[0].startsWith(`var${i}-pa_`)) {
                        if (pair[1] === 'nothing') continue;
                        obj.later.create[i].attributes.push({
                          id: this.attr.find(
                            (e) => e.slug === pair[0].replace(`var${i}-`, '')
                          ).id,
                          option: pair[1],
                        });
                        if (
                          obj.first.attributes.find(
                            (e) =>
                              e.id ===
                              this.attr.find(
                                (e) =>
                                  e.slug === pair[0].replace(`var${i}-`, '')
                              ).id
                          ) === undefined
                        ) {
                          obj.first.attributes.push({
                            id: this.attr.find(
                              (e) => e.slug === pair[0].replace(`var${i}-`, '')
                            ).id,
                            variation: true,
                            options: [pair[1]],
                          });
                        } else {
                          obj.first.attributes
                            .find(
                              (e) =>
                                e.id ===
                                this.attr.find(
                                  (e) =>
                                    e.slug === pair[0].replace(`var${i}-`, '')
                                ).id
                            )
                            .options.push(pair[1]);
                        }
                      } else {
                        obj.later.create[i][pair[0].replace(`var${i}-`, '')] =
                          pair[1];
                      }
                    }
                  }
                } else {
                  if (pair[0] === 'pa_brand') {
                    if (pair[1] !== 'nothing') {
                      obj.first.attributes.push({
                        id: this.attr.find((e) => e.slug === pair[0]).id,
                        variation: false,
                        options: [pair[1]],
                      });
                    }
                  } else {
                    obj.first[pair[0]] = pair[1];
                  }
                }
              }

              $('#content').LoadingOverlay('show');
              try {
                let response = await this.api.post('products', obj.first);
                if (response.status === 201) {
                  let response2 = await this.api.post(
                    `products/${response.data.id}/variations/batch`,
                    obj.later
                  );
                  if (response2.status === 200) {
                    this.ui.showAlert(
                      'محصول با موفقیت اضافه شد',
                      'alert-success'
                    );
                    num = -1;
                    document.querySelector('#frm').reset();
                    document.querySelector('#group').innerHTML = '';
                  }
                } else {
                  this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
                }
              } catch (e) {
                fs.appendFileSync(
                  './error.log',
                  `[${new Date()}] ${e.toString()}\n`
                );
                this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
              }
              $('#content').LoadingOverlay('hide');

              e.preventDefault();
            });
          document.querySelector('#clear').addEventListener('click', (e) => {
            num = -1;
            document.querySelector('#frm').reset();
            document.querySelector('#group').innerHTML = '';
            e.preventDefault();
          });
        } else {
          document.querySelector('#card-body').innerHTML = `
            <p class="persian" style="text-align:center;">نوع محصول را مشخص کنید!</p>
          `;
        }
      });
  }
}
class CreateBarcode {}

class Order {
  constructor() {
    this.storage = new Storage();
    this.ui = new UI(this);
    this.api = new WooCommerceRestApi({
      url: 'https://www.alpha-stock.com/',
      consumerKey: 'ck_26ccbb0e20a8ad26a023fe56a9331312ac86149c',
      consumerSecret: 'cs_35c1b82c8bb01feb21d4783c934daded875ad23d',
    });
    this.printer = new Printer();
    this.data = this.storage.getCurrentOrder();
    this.ui.showCurrentOrder();
  }
  async addItem(sku) {
    $('#table').LoadingOverlay('show');
    try {
      let response = await this.api.get('products', { sku });
      if (response.status === 200) {
        if (response.data.length) {
          let exist = this.data.items.find((e) => e.sku === sku);
          if (exist) {
            if (exist.count + 1 <= exist.maxCount) {
              exist.count++;
              this.ui.updateItem(exist);
            } else {
              this.ui.showAlert('حداکثر موجودی محصول', 'alert-danger');
            }
          } else {
            if (response.data[0].stock_quantity !== 0) {
              let item = {
                sku,
                id: response.data[0].id,
                parent_id: response.data[0].parent_id,
                name: response.data[0].name,
                price: response.data[0].price,
                count: 1,
                maxCount: response.data[0].stock_quantity,
                offer: {
                  amount: 0,
                  type: 'darsad',
                },
              };
              if (response.data[0].images.length) {
                item.img = response.data[0].images[0].src;
              } else {
                item.img = './src/woocommerce-placeholder.png';
              }
              if (this.data.items.length === 0) this.ui.emptyOrder(false);
              this.data.items.push(item);
              this.ui.addItem(item);
            } else {
              this.ui.showAlert('اتمام موجودی محصول', 'alert-danger');
            }
          }
          this.updateTotal();
          this.storage.setCurrentOrder(this.data);
          this.ui.addEvents();
          this.ui.updateTotal();
        } else {
          this.ui.showAlert('محصولی یافت نشد', 'alert-danger');
        }
      } else {
        this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
      }
    } catch (e) {
      fs.appendFileSync('./error.log', `[${new Date()}] ${e.toString()}\n`);
      this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
    }
    $('#table').LoadingOverlay('hide');
  }
  updateItem(sku, prob, value) {
    $('#table').LoadingOverlay('show');
    let item = this.data.items.find((e) => e.sku === sku);
    item[prob] = value;
    this.ui.updateItem(item);
    this.updateTotal();
    this.storage.setCurrentOrder(this.data);
    this.ui.updateTotal();
    $('#table').LoadingOverlay('hide');
  }
  removeItem(sku) {
    $('#table').LoadingOverlay('show');
    this.data.items.find((e, i, a) => {
      if (e.sku === sku) {
        a.splice(i, 1);
      }
    });
    this.ui.removeItem(sku);
    this.updateTotal();
    this.storage.setCurrentOrder(this.data);
    this.ui.updateTotal();
    if (this.data.items.length === 0) this.ui.emptyOrder(true);
    $('#table').LoadingOverlay('hide');
  }
  updateTotal() {
    this.data.total.products = this.data.items.length;
    this.data.total.count = +this.data.items.reduce((a, b) => {
      return +a + +b.count;
    }, 0);
    this.data.total.totalPrice = +this.data.items.reduce((a, b) => {
      return +a + +b.count * +b.price;
    }, 0);
    this.data.total.productsOffer = +this.data.items.reduce((a, b) => {
      let c = 0;
      if (b.offer.amount > 0) {
        if (b.offer.type === 'tomaan') {
          c = +b.offer.amount;
        } else if (b.offer.type === 'darsad') {
          c = (+b.count * +b.price * +b.offer.amount) / 100;
        }
      }
      return a + c;
    }, 0);
    let totalOffer = 0;
    if (this.data.total.offer.amount > 0) {
      if (this.data.total.offer.type === 'tomaan') {
        totalOffer = +this.data.total.offer.amount;
      } else if (this.data.total.offer.type === 'darsad') {
        totalOffer =
          ((+this.data.total.totalPrice - +this.data.total.productsOffer) *
            +this.data.total.offer.amount) /
          100;
      }
    }
    this.data.total.totalOffer = +totalOffer;
  }
  updateTotalOffer(value) {
    $('#table').LoadingOverlay('show');
    this.data.total.offer = value;
    this.updateTotal();
    this.storage.setCurrentOrder(this.data);
    this.ui.updateTotal();
    $('#table').LoadingOverlay('hide');
  }
  clear() {
    $('#table').LoadingOverlay('show');
    this.data = {
      items: [],
      total: {
        products: 0,
        count: 0,
        totalPrice: 0,
        productsOffer: 0,
        totalOffer: 0,
        offer: {
          amount: 0,
          type: 'darsad',
        },
      },
    };
    this.storage.setCurrentOrder(this.data);
    this.ui.showCurrentOrder();
    $('#table').LoadingOverlay('hide');
  }
  async finish() {
    $('#table').LoadingOverlay('show');
    try {
      let index = -1;
      for (const [i, e] of this.data.items.entries()) {
        let response;
        if (e.parent_id === 0) {
          response = await this.api.put(`products/${e.id}`, {
            stock_quantity: e.maxCount - e.count,
          });
        } else {
          response = await this.api.put(
            `products/${e.parent_id}/variations/${e.id}`,
            {
              stock_quantity: e.maxCount - e.count,
            }
          );
        }
        if (response.status !== 200 || !response.data) {
          index = i;
          break;
        }
      }
      if (index !== -1) {
        for (let i = 0; i <= index; i++) {
          let e = this.data.items[i];
          if (e.parent_id === 0) {
            await this.api.put(`products/${e.id}`, {
              stock_quantity: e.maxCount,
            });
          } else {
            await this.api.put(`products/${e.parent_id}/variations/${e.id}`, {
              stock_quantity: e.maxCount,
            });
          }
        }
      }
    } catch (e) {
      fs.appendFileSync('./error.log', `[${new Date()}] ${e.toString()}\n`);
      this.ui.showAlert('دوباره تلاش کنید', 'alert-danger');
    }
    let obj = this.storage.addOrder(this.data);
    this.printer.printOrder(obj);
    this.clear();
    $('#table').LoadingOverlay('hide');
  }
}
class UI {
  constructor(order) {
    this.order = order;
  }
  showCurrentOrder() {
    if (!this.order.data.items.length) {
      this.emptyOrder(true);
    } else {
      this.emptyOrder(false);
      this.order.data.items.forEach((e) => {
        this.addItem(e);
      });
      this.addEvents();
      this.updateTotal();
    }
  }
  addItem(item) {
    let html = `
    <tr id="${item.sku}">
    <th scope="row">
        ${document.querySelector('#order-list').childElementCount + 1}
        <a id="remove-${item.sku}" href="" class="block">
            <span class="badge bg-danger rounded-pill"><i class='fas fa-times'></i>
        </a>
        </span>
    </th>
    <td>
    <img src="${item.img}" alt="" class="img" />
    </td>
    <th>${item.name}</th>
    <td>${this.toIndiaDigits(this.commafy(item.price))} تومان</td>
    <td>
        <div class="input-group max" style="border: dotted; border-color: lightgray">
            <input 
            id="count-${item.sku}"
            type="number" class="form-control"
            value="${item.count}"
            min="1" max="${item.maxCount}"
            />
        </div>
    </td>
    <th id="totalPrice-${item.sku}">
    `;
    if (item.offer.amount > 0) {
      html += `<s class='block text-danger mb-1'>${this.toIndiaDigits(
        this.commafy(item.price * item.count)
      )} تومان</s>`;
      if (item.offer.type === 'darsad') {
        html += `${this.toIndiaDigits(
          this.commafy(
            item.price * item.count -
              (item.price * item.count * item.offer.amount) / 100
          )
        )} تومان`;
      } else if (item.offer.type === 'tomaan') {
        html += `${this.toIndiaDigits(
          this.commafy(item.price * item.count - item.offer.amount)
        )} تومان`;
      }
    } else {
      html += `${this.toIndiaDigits(
        this.commafy(item.price * item.count)
      )} تومان`;
    }
    html += `
      </th>
      <td>
        <form id="form-${item.sku}">
          <div class="form-group">
              <div class="input-group max" style="border: dotted; border-color: lightgray">
                  <input type="text" class="form-control form-control-sm" id="offerAmount-${
                    item.sku
                  }" value="${item.offer.amount}" />
                  <select class="form-select form-select-sm" id="offerSelect-${
                    item.sku
                  }" style="padding: 0.5rem">
                      <option value="tomaan" ${
                        item.offer.type === 'tomaan' ? 'selected' : ''
                      }>تومان</option>
                      <option value="darsad" ${
                        item.offer.type === 'darsad' ? 'selected' : ''
                      }>درصد</option>
                  </select>
              </div>
          </div>
        </form>
      </td>
    </tr>
    `;
    // document.querySelector('#order-list').innerHTML += html;
    document.querySelector('#order-list').insertAdjacentHTML('beforeend', html);
    window.scrollTo(0, document.body.scrollHeight);
  }
  addEvents() {
    this.order.data.items.forEach((item) => {
      document
        .querySelector('#count-' + item.sku)
        .addEventListener('change', (e) => {
          if (
            e.target.value !== item.count &&
            e.target.value <= item.maxCount
          ) {
            this.order.updateItem(item.sku, 'count', +e.target.value);
          }
        });
      document
        .querySelector('#form-' + item.sku)
        .addEventListener('change', (e) => {
          let amount = document.querySelector(`#offerAmount-${item.sku}`).value;
          let type = document.querySelector(`#offerSelect-${item.sku}`).value;
          let valid = function (check, order) {
            if (check) {
              document
                .querySelector(`#offerAmount-${item.sku}`)
                .classList.remove('is-invalid');
              order.updateItem(item.sku, 'offer', {
                amount,
                type,
              });
            } else {
              document
                .querySelector(`#offerAmount-${item.sku}`)
                .classList.add('is-invalid');
            }
          };
          if (type === 'darsad') {
            if (!isNaN(+amount) && amount <= 100) {
              valid(true, this.order);
            } else {
              valid(false);
            }
          } else if (type === 'tomaan') {
            if (!isNaN(+amount) && amount <= item.count * item.price) {
              valid(true, this.order);
            } else {
              valid(false);
            }
          }
        });
      document
        .querySelector('#form-' + item.sku)
        .addEventListener('submit', (e) => {
          e.preventDefault();
        });
      document
        .querySelector('#remove-' + item.sku)
        .addEventListener('click', (e) => {
          this.order.removeItem(item.sku);
          e.preventDefault();
        });
    });
  }
  removeItem(sku) {
    document.querySelector('#' + sku).remove();
  }
  updateItem(item) {
    let html = '';
    if (item.offer.amount > 0) {
      html += `<s class='block text-danger mb-1'>${this.toIndiaDigits(
        this.commafy(item.price * item.count)
      )} تومان</s>`;
      if (item.offer.type === 'darsad') {
        html += `${this.toIndiaDigits(
          this.commafy(
            item.price * item.count -
              (item.price * item.count * item.offer.amount) / 100
          )
        )} تومان`;
      } else if (item.offer.type === 'tomaan') {
        html += `${this.toIndiaDigits(
          this.commafy(item.price * item.count - item.offer.amount)
        )} تومان`;
      }
    } else {
      html += `${this.toIndiaDigits(
        this.commafy(item.price * item.count)
      )} تومان`;
    }
    document.querySelector(`#totalPrice-${item.sku}`).innerHTML = html;
    document.querySelector(`#count-${item.sku}`).value = item.count;
    document.querySelector(`#offerAmount-${item.sku}`).value =
      item.offer.amount;
    document.querySelector(`#offerSelect-${item.sku}`).value = item.offer.type;
  }
  updateTotal() {
    let html = `
    <tr>
        <td>محصولات</td>
        <td>${this.toIndiaDigits(
          this.order.data.total.products.toString()
        )}</td>
    </tr>
    <tr>
        <td>تعداد کل</td>
        <td>${this.toIndiaDigits(this.order.data.total.count.toString())}</td>
    </tr>
    `;
    if (this.order.data.total.productsOffer) {
      html += `
      <tr>
        <td>قیمت کل</td>
        <td>
        <span class="text-danger">
        ${
          this.order.data.total.productsOffer
            ? this.toIndiaDigits(
                this.commafy(this.order.data.total.productsOffer.toString())
              ) + ' تومان -'
            : ''
        }
        </span>
        ${this.toIndiaDigits(
          this.commafy(this.order.data.total.totalPrice.toString())
        )} تومان
        </td>
      </tr>
      `;
    }
    html += `
    <tr>
        <td>جمع کل</td>
        <td>
        <span class="text-danger">
        ${
          this.order.data.total.totalOffer
            ? this.toIndiaDigits(
                this.commafy(this.order.data.total.totalOffer.toString())
              ) + ' تومان -'
            : ''
        }
        </span>
        ${this.toIndiaDigits(
          this.commafy(
            this.order.data.total.totalPrice -
              this.order.data.total.productsOffer
          )
        )} تومان
        </td>
    </tr>
    <tr class="table-active">
        <th>قابل پرداخت</th>
        <th>
        ${this.toIndiaDigits(
          this.commafy(
            this.order.data.total.totalPrice -
              this.order.data.total.productsOffer -
              this.order.data.total.totalOffer
          )
        )} تومان
        </th>
    </tr>`;
    document.querySelector('#total-table').innerHTML = html;
    document.querySelector('#total-offer-amount').value =
      this.order.data.total.offer.amount;
    document.querySelector('#total-offer-type').value =
      this.order.data.total.offer.type;
  }
  emptyOrder(check) {
    if (check) {
      document.querySelector('#order-list').innerHTML = `
      <tr id="empty-order"><th class="table-danger" colspan="7">محصولی اضافه نشده است...</th></tr>
      `;
      $('#order-buttons').hide();
      $('#table-footer').hide();
    } else {
      document.querySelector('#empty-order')?.remove();
      $('#order-buttons').show();
      $('#table-footer').show();
    }
  }
  showAlert(msg, status) {
    document.querySelector('#alert').innerHTML += `
    <div class="alert alert-dismissible persian ${status}">
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      <strong style="font-weight: bold;">${msg}</strong>
    </div>
    `;
    document.querySelector('#alert').scrollIntoView();
    setTimeout(() => {
      document.querySelector('#alert').innerHTML = '';
    }, 5000);
  }
  toIndiaDigits(str) {
    let id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.replace(/[0-9]/g, function (w) {
      return id[+w];
    });
  }
  commafy(num) {
    let str = num.toString().split('.');
    str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
    if (str[1]) {
      str[1] = str[1].replace(/(\d{3})/g, '$1 ');
    }
    return str.join('.');
  }
}
class Storage {
  getCurrentOrder() {
    if (localStorage.getItem('currentOrder')) {
      return JSON.parse(localStorage.getItem('currentOrder'));
    } else {
      return {
        items: [],
        total: {
          products: 0,
          count: 0,
          totalPrice: 0,
          productsOffer: 0,
          totalOffer: 0,
          offer: {
            amount: 0,
            type: 'darsad',
          },
        },
      };
    }
  }
  setCurrentOrder(order) {
    localStorage.setItem('currentOrder', JSON.stringify(order));
  }
  addOrder(order) {
    let o = { ...order };
    let lastNumber = localStorage.getItem('lastOrder');
    o.number = lastNumber === null ? 1 : ++lastNumber;
    o.date = new Date();
    fs.appendFileSync('./db', JSON.stringify(o) + ',\n');
    localStorage.setItem('lastOrder', o.number);
    return o;
  }
}
class Printer {
  constructor() {
    this.ui = new UI();
    this.config = qz.configs.create('POS-80C', { scaleContent: 'true' });
  }
  async printOrder(order) {
    let html = `
    <!DOCTYPE html>
    <html>
    
    <head>
      <style>
        body {
          direction: rtl;
          font-size: 12px;
          margin: 0;
        }
    
        table,
        td,
        th {
          border: 1px solid black;
        }
    
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: center;
        }
    
        #footer>tbody>tr>td {
          border: 2px solid black;
        }
    
        .padd {
          padding: 7px 0 7px 0;
        }
    
        .header {
          background-color: black;
          color: white;
        }
    
        .header>tr>* {
          border-color: white;
        }
    
        .info {
          text-align: center;
          width: 33.33%;
          padding: 2mm;
        }
    
        .info>p {
          display: inline;
        }
      </style>
    </head>
    
    <body>
      <h1 style="text-align: center; margin:1mm;">فروشگاه آلفا استوک</h1>
      <p style="text-align: center; margin:1mm;">عرضه کننده محصولات اروپایی</p>
      <div style="border: 1px solid black; border-radius: 10px;">
        <div style="width: 100%; text-align: center; border-bottom: 1px dotted black;">
          <p style="font-size: 16px; margin: 0;">رسید خرید</p>
        </div>
        <div style="width: 100%; display: flex;">
          <div class="info">
            <p>شماره فاکتور: </p>
            <span>${order.number}</span>
          </div>
          <div class="info">
            <p>تاریخ: </p>
            <span>${this.ui.toIndiaDigits(
              moment(order.date).locale('fa').format('YYYY/M/D')
            )}</span>
          </div>
          <div class="info">
            <p>ساعت: </p>
            <span>${this.ui.toIndiaDigits(
              moment(order.date).locale('fa').format('HH:m:ss')
            )}</span>
          </div>
    
        </div>
        <table>
          <thead style="border: 2px solid black;" class="header">
            <tr>
              <th rowspan="2" style="width:5%;">ردیف</th>
              <th rowspan="2" style="width:50%">محصول</th>
              <th rowspan="2" style="width:5%;"><span style="transform:rotate(90.0deg);">تعداد</span></th>
              <th class="padd">قیمت</th>
            </tr>
            <tr>
              <th class="padd">قیمت کل</th>
            </tr>
          </thead>
          <tbody>`;
    order.items.forEach((e, i) => {
      html += `
            <tr>
              <td rowspan="2">${this.ui.toIndiaDigits((i + 1).toString())}</th>
              <td rowspan="2">${e.name}</th>
              <td rowspan="2">${this.ui.toIndiaDigits(e.count.toString())}</th>
              <td class="padd">
              ${this.ui.toIndiaDigits(this.ui.commafy(e.price))} تومان
              </td>
            </tr>
            <tr>
              <td class="padd">
              ${this.ui.toIndiaDigits(this.ui.commafy(e.count * e.price))} تومان
              </td>
            </tr>`;
    });
    html += `
          </tbody>
        </table>
        <table id="footer" style="margin-top: 5mm;">
          <tbody>
            <tr>
              <td>تعداد کالا</td>
              <td>${this.ui.toIndiaDigits(order.total.count.toString())}</td>
            </tr>
            <tr>
              <td>تخفیف</td>
              <td>
              ${
                order.total.totalOffer + order.total.productsOffer
                  ? this.ui.toIndiaDigits(
                      this.ui.commafy(
                        order.total.totalOffer + order.total.productsOffer
                      )
                    ) + ' تومان'
                  : '-'
              }
              </td>
            </tr>
            <tr>
              <td>جمع کل</td>
              <td style="background-color: black; color: white;">
              ${this.ui.toIndiaDigits(
                this.ui.commafy(
                  order.total.totalPrice -
                    order.total.productsOffer -
                    order.total.totalOffer
                )
              )} تومان
              </td>
            </tr>
          </tbody>
        </table>
        <div style="width: 100%; text-align: center;">
          <p style="margin:1mm;">آدرس: سردشت، بازارچه گلزار، طبقه آخر</p>
          <p style="margin:1mm;">تلفن: 09143447851 - 09149245916 - 09149245816</p>
          <p style="margin:1mm;">www.Alpha-Stock.com</p>
        </div>
      </div>

    </body>

    </html>`;
    await qz.print(this.config, [
      `\x1B\x61\x31`, // center align
      {
        type: 'raw',
        format: 'image',
        data: 'logo.png',
        options: {
          language: 'ESCPOS',
          dotDensity: 'double',
        },
      }]);
    await qz.print(this.config, [
      {
        type: 'html',
        format: 'plain',
        data: html,
      },
    ]);
  }
}
class App {
  constructor() {
    this.page = new PageState();
  }
}

window.onload = async () => {
  let app = new App();
  try {
    await qz.websocket.connect();
  } catch (e) {
    fs.appendFileSync('./error.log', `[${new Date()}] ${e.toString()}\n`);
    this.ui.showAlert('مشکل در اتصال به پرینتر', 'alert-danger');
  }
};
