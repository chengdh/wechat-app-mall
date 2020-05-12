const WXAPI = require('../../wxapi/main')
const CONFIG = require('../../config.js')
const TOOLS = require('../../utils/tools.js')

//获取应用实例
var app = getApp()
Page({
  data: {
    inputShowed: false, // 是否显示搜索框
    inputVal: "", // 搜索框内容
    category_box_width: 750, //分类总宽度
    goodsRecommend: [], // 推荐商品
    kanjiaList: [], //砍价商品列表
    pingtuanList: [], //拼团商品列表
    kanjiaGoodsMap: {}, //砍价商品列表

    indicatorDots: true,
    autoplay: true,
    interval: 3000,
    duration: 1000,
    loadingHidden: false, // loading
    userInfo: {},
    swiperCurrent: 0,
    selectCurrent: 0,
    categories: [],
    activeCategoryId: 0,
    goods: [],
    
    scrollTop: 0,
    loadingMoreHidden: true,

    coupons: [],
    couponOpen: false,

    curPage: 1,
    pageSize: 20,
    jiesuanInfo: {
      hideSummaryPopup: true,
      totalPrice: 0,
      totalScore: 0,
      shopNum: 0
    },
    cateScrollTop: 0
  },

  tabClick: function(e) {
    wx.navigateTo({
      url: '/pages/goods/list?categoryId=' + e.currentTarget.id,
    })
  },
  //事件处理函数
  swiperchange: function(e) {
    //console.log(e.detail.current)
    this.setData({
      swiperCurrent: e.detail.current
    })
  },
  toDetailsTap: function(e) {
    wx.navigateTo({
      url: "/pages/goods-details/index?id=" + e.currentTarget.dataset.id
    })
  },
  tapBanner: function(e) {
    if (e.currentTarget.dataset.id != 0) {
      wx.navigateTo({
        url: "/pages/goods-details/index?id=" + e.currentTarget.dataset.id
      })
    }
  },
  bindTypeTap: function(e) {
    this.setData({
      selectCurrent: e.index
    })
  },
  onLoad: function(e) {   
    wx.showShareMenu({
      withShareTicket: true
    }) 
    const that = this
    // if (e && e.query && e.query.inviter_id) { 
    //   wx.setStorageSync('referrer', e.query.inviter_id)
    // }
    if (e && e.scene) {
      const scene = decodeURIComponent(e.scene)
      var items = scene.split("&");
      var result = {};
      for (var i = 0; i < items.length; i++) {
        var arr = items[i].split("=");
        result[arr[0]] = arr[1];
      }
      if (result.i) {        
        wx.setStorageSync('referrer', result.i)
      }
    }
    wx.setNavigationBarTitle({
      title: wx.getStorageSync('mallName')
    })
    /**
     * 示例：
     * 调用接口封装方法
     */
    WXAPI.banners({
      type: 'new'
    }).then(function(res) {
      if (res.code == 700 || res.code == 404) {
        wx.showModal({
          title: '提示',
          content: '请在后台添加 banner 横幅图，位置选择首页',
          showCancel: false
        })
      } else {
        that.setData({
          banners: res.data
        });
      }
    }).catch(function(e) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
    })
    this.categories()
    /*WXAPI.goodsCategory().then(function(res) {
      let categories = [{
        id: 0,
        icon: '/images/fl.png',
        name: "全部"
      }];
      if (res.code == 0) {
        categories = categories.concat(res.data)
      }
      const _n = 1;//Math.ceil(categories.length / 2)
      // const _n = Math.ceil(categories.length)
      that.setData({
        categories: categories,
        category_box_width: 150 * _n,
        activeCategoryId: 0,
        curPage: 1
      });
      that.getGoodsList(0);
    })*/

    WXAPI.goods({
      recommendStatus: 1
    }).then(res => {
      if (res.code === 0){
        that.setData({
          goodsRecommend: res.data
        })
      }      
    })
    let couponOpen = wx.getStorageSync('coupon_open')
    if (couponOpen && couponOpen == '1') {
      couponOpen = true
    } else {
      couponOpen = false
    }
    this.setData({
      couponOpen: couponOpen
    })
    
    that.getCoupons()
    that.getNotice()
    that.kanjiaGoods()
    that.pingtuanGoods()
  },
  onShow: function(e){
    // 获取购物车数据，显示TabBarBadge
    TOOLS.showTabBarBadge();
    this.refreshTotalPrice();
  },
  async categories(){
    const res = await WXAPI.goodsCategory()
    let categories = [];
    if (res.code == 0) {
      const _categories = res.data.filter(ele => {
        return true;//ele.level == 1
      })
      categories = categories.concat(_categories)
    }
    const _n = Math.ceil(categories.length / 2)
    // const _n = Math.ceil(categories.length)
    this.setData({
      categories: categories,
      category_box_width: 150 * _n,
      activeCategoryId: 0,
      curPage: 1
    });
    this.getGoodsList(0);
  },
  onPageScroll(e) {
    let scrollTop = this.data.scrollTop
    this.setData({
      scrollTop: e.scrollTop
    })
  },
  getGoodsList: function(categoryId, append) {
    if (categoryId == 0) {
      categoryId = "";
    }
    var that = this;
    wx.showLoading({
      "mask": true
    })
    WXAPI.goods({
      categoryId: categoryId,
      nameLike: that.data.inputVal,
      page: this.data.curPage,
      pageSize: this.data.pageSize
    }).then(function(res) {
      wx.hideLoading()
      if (res.code == 404 || res.code == 700) {
        let newData = {
          loadingMoreHidden: false
        }
        if (!append) {
          newData.goods = []
        }
        that.setData(newData);
        return
      }
      let goods = [];
      if (append) {
        goods = that.data.goods
      }
      for (var i = 0; i < res.data.length; i++) {
        goods.push(res.data[i]);
      }
      that.setData({
        loadingMoreHidden: true,
        goods: goods,
      });
      that.refreshTotalPrice();
    })
  },
  getCoupons: function() {
    var that = this;
    WXAPI.coupons().then(function (res) {
      if (res.code == 0) {
        that.setData({
          coupons: res.data
        });
      }
    })
  },
  onShareAppMessage: function() {    
    return {
      title: '"' + wx.getStorageSync('mallName') + '" ' + CONFIG.shareProfile,
      path: '/pages/index/index?inviter_id=' + wx.getStorageSync('uid')
    }
  },
  getNotice: function() {
    var that = this;
    WXAPI.noticeList({pageSize: 5}).then(function (res) {
      if (res.code == 0) {
        that.setData({
          noticeList: res.data
        });
      }
    })
  },
  listenerSearchInput: function (e) {
    this.setData({
      inputVal: e.detail.value
    })
  },
  toSearch: function() {
    wx.navigateTo({
      url: '/pages/goods/list?name=' + this.data.inputVal,
    })
  },
  onReachBottom: function() {
    this.setData({
      curPage: this.data.curPage + 1
    });
    this.getGoodsList(this.data.activeCategoryId, true)
  },
  onPullDownRefresh: function() {
    this.setData({
      curPage: 1
    });
    this.getGoodsList(this.data.activeCategoryId)
    wx.stopPullDownRefresh()
  },
  // 以下为搜索框事件
  showInput: function () {
    this.setData({
      inputShowed: true
    });
  },
  hideInput: function () {
    this.setData({
      inputVal: "",
      inputShowed: false
    });
  },
  clearInput: function () {
    this.setData({
      inputVal: ""
    });
  },
  inputTyping: function (e) {
    this.setData({
      inputVal: e.detail.value
    });
  },
  // 以下为砍价业务
  kanjiaGoods(){
    const _this = this
    WXAPI.kanjiaList().then(function (res) {
      if (res.code == 0) {
        _this.setData({
          kanjiaList: res.data.result,
          kanjiaGoodsMap: res.data.goodsMap
        })
      }
    })
  },
  goCoupons: function (e) {
    wx.navigateTo({
      url: "/pages/coupons/index"
    })
  },
  onTotalPriceChange: function (e) {
    let hideSummaryPopup = true;
    if (e.detail.totalPrice > 0) {
      hideSummaryPopup = false;
    }
    this.setData({
      jiesuanInfo: {
        hideSummaryPopup: hideSummaryPopup,
        totalPrice: e.detail.totalPrice,
        totalScore: e.detail.totalScore,
        shopNum: e.detail.shopNum
      }
    });

  },
  navigateToCartShop: function () {
    wx.hideLoading();
    wx.switchTab({
      url: "/pages/shop-cart/index"
    })
  },
  resetGoodsBuyNum: function () {
    var goods = this.data.goods;
    if (goods.length > 0) {
      for (var i = 0; i < goods.length; i++) {
        goods[i].buyNum = 0;
      }
    }
  },
  refreshTotalPrice: function () {
    var shopCarInfo = wx.getStorageSync('shopCarInfo');
    var goods = this.data.goods;
    this.resetGoodsBuyNum();
    let hideSummaryPopup = true;
    let totalPrice = 0;
    let totalScore = 0;
    let shopNum = 0;
    if (shopCarInfo) {
      totalPrice = shopCarInfo.totalPrice;
      totalScore = shopCarInfo.totalScore;
      shopNum = shopCarInfo.shopNum;

      if (shopNum > 0 && shopCarInfo.shopList && shopCarInfo.shopList.length > 0) {
        hideSummaryPopup = false;
        if (goods.length > 0) {
          for (var j = 0; j < shopCarInfo.shopList.length; j++) {
            var tmpShopCarMap = shopCarInfo.shopList[j];
            if (tmpShopCarMap.active) {
              for (var i = 0; i < goods.length; i++) {
                if (tmpShopCarMap.goodsId === goods[i].id) {
                  goods[i].buyNum = tmpShopCarMap.number;
                  break;
                }
              }
            }
          }
        }
      }
    }

    this.setData({
      jiesuanInfo: {
        hideSummaryPopup: hideSummaryPopup,
        totalPrice: totalPrice,
        totalScore: totalScore,
        shopNum: shopNum,
      },
      goods: goods
    });
  },
  navigateToPayOrder: function (e) {
    wx.hideLoading();
    wx.navigateTo({
      url: "/pages/to-pay-order/index"
    })
  },
  pingtuanGoods(){ // 获取团购商品列表
    const _this = this
    WXAPI.goods({
      pingtuan: true
    }).then(res => {
      if (res.code === 0) {
        _this.setData({
          pingtuanList: res.data
        })
      }
    })
  }
})
