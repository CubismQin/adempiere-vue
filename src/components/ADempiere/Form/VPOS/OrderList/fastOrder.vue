<!--
 ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
 Copyright (C) 2017-Present E.R.P. Consultores y Asociados, C.A.
 Contributor(s): Yamel Senih ysenih@erpya.com www.erpya.com
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https:www.gnu.org/licenses/>.
-->
<template>
  <span>
    <el-button type="primary" plain @click="newOrder()">
      {{ $t('form.pos.optionsPoinSales.salesOrder.newOrder') }}
    </el-button>
    <el-dropdown size="mini" trigger="click" @command="handleCommand">
      <el-button type="primary" size="small" style="padding: 10px;padding-left: 5px;">
        <i class="el-icon-arrow-down el-icon--right" />
      </el-button>
      <el-dropdown-menu slot="dropdown">
        <template v-for="(option, key) in quickOptions">
          <el-dropdown-item v-show="option.isShow" :key="key" :command="option">
            <el-popover
              :key="key"
              v-model="option.isVisible"
              placement="right"
              trigger="click"
              width="900"
            >
              <find-orders
                :data="option"
                :data-list="orderList"
                :is-loading-table="isloading"
                :params="option.params"
                :show-field="showToDeliveOrders"
              >
                <el-form label-position="top" :inline="true" class="demo-form-inline" @submit.native.prevent="notSubmitForm">
                  <el-form-item label="No. del Documento">
                    <el-input v-model="input" placeholder="Please input" @change="listOrdersInvoiced" />
                  </el-form-item>
                  <el-form-item
                    v-for="(field) in metadataList"
                    :key="field.columnName"
                  >
                    <field
                      :metadata-field="{
                        ...field,
                        size: 6,
                        name: field.columnName === 'DateOrderedFrom' ? $t('form.pos.optionsPoinSales.generalOptions.dateOrder') : field.name
                      }"
                    />
                  </el-form-item>
                </el-form>
              </find-orders>
              <custom-pagination
                :total="total"
                :current-page="currentPage"
                :handle-change-page="handleChangePage"
                layout="total, prev, pager, next"
                style="float: right;"
              />
              <el-row :gutter="24">
                <el-col :span="24">
                  <samp style="float: right; padding-right: 10px;">
                    <el-button
                      type="danger"
                      class="custom-button-create-bp"
                      icon="el-icon-close"
                      @click="closeSearch(option)"
                    />
                    <el-button
                      type="primary"
                      class="custom-button-create-bp"
                      icon="el-icon-check"
                      @click="openOrder(option)"
                    />
                  </samp>
                </el-col>
              </el-row>
              <el-button slot="reference" type="text" style="color: #333" @click="option.isVisible = true">
                {{ option.title }}
              </el-button>
            </el-popover>
          </el-dropdown-item>
        </template>
      </el-dropdown-menu>
    </el-dropdown>
  </span>
</template>

<script>
import fieldsListOrders from './fieldsListOrders.js'
import CustomPagination from '@/components/ADempiere/Pagination'
import {
  createFieldFromDictionary
} from '@/utils/ADempiere/lookupFactory'
import {
  formatDate,
  formatPrice
} from '@/utils/ADempiere/valueFormat.js'
import {
  listOrders
} from '@/api/ADempiere/form/point-of-sales.js'
import { createShipment, shipments, holdOrder } from '@/api/ADempiere/form/point-of-sales.js'
import FindOrders from './FindOrders'
import Field from '@/components/ADempiere/Field'
import { extractPagingToken } from '@/utils/ADempiere/valueUtils.js'

export default {
  name: 'AisleVendorList',
  components: {
    CustomPagination,
    FindOrders,
    Field
  },
  props: {
    metadata: {
      type: Object,
      default: () => {
        return {
          panelType: 'from',
          uuid: 'Aisle-Vendor-List',
          containerUuid: 'Aisle-Vendor-List'
        }
      }
    },
    showField: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      fieldsList: fieldsListOrders,
      metadataList: {},
      total: 0,
      currentPage: 1,
      tokenPage: '',
      input: '',
      valueVisible: false,
      isCustomForm: true,
      businessPartner: '',
      timeOut: null,
      changeOrder: {},
      isloading: true,
      ordersInvoiced: [],
      ordersComplete: [],
      dateOrdered: '',
      searchCriteria: {},
      currentOptions: {},
      orderList: [],
      openPopover: false,
      isStatus: ''
    }
  },
  computed: {
    allowsConfirmShipment() {
      return this.currentPointOfSales.isAllowsConfirmShipment
    },
    quickOptions() {
      return [
        {
          title: this.$t('form.byInvoice.label'),
          params: {
            isOnlyAisleSeller: true,
            isWaitingForInvoice: false
          },
          isVisible: false,
          isShow: true
        },
        {
          title: this.$t('form.byInvoice.toCollect'),
          params: {
            isWaitingForPay: true
          },
          isVisible: false,
          isShow: true
        },
        {
          title: this.$t('form.byInvoice.toDeliver'),
          params: {
            isOnlyProcessed: true,
            isWaitingForShipment: true
          },
          isVisible: false,
          isShow: this.allowsConfirmShipment
        },
        {
          title: this.$t('form.byInvoice.searchCompleteOrders'),
          params: {
            isOnlyProcessed: true
          },
          isVisible: false,
          isShow: true
        }
      ]
    },
    isProcessed() {
      if (!this.isEmptyValue(this.currentOrder.documentStatus.value) && this.currentOrder.documentStatus.value === 'CO' && this.allowsConfirmShipment) {
        return true
      }
      return false
    },
    currentOrder() {
      return this.$store.getters.posAttributes.currentPointOfSales.currentOrder
    },
    currentPointOfSales() {
      return this.$store.getters.posAttributes.currentPointOfSales
    },
    highlightRow() {
      if (!this.isEmptyValue(this.selectOrder)) {
        return true
      }
      return false
    },
    selectOrder() {
      const action = this.$route.query.action
      if (!this.isEmptyValue(this.ordersInvoiced)) {
        const order = this.ordersInvoiced.find(item => item.uuid === action)
        if (!this.isEmptyValue(order)) {
          return order
        }
      }
      return null
    },
    sortFieldsListOrder() {
      return this.fieldsList.find(field => field.columnName === 'C_BPartner_ID')
    },
    dateOrderedFrom() {
      return this.fieldsList.find(field => {
        if (field.columnName === 'DateOrdered') {
          return field
        }
      })
    },
    allowsCreateOrder() {
      return this.$store.getters.posAttributes.currentPointOfSales.isAllowsCreateOrder
    },
    showConfirmDelivery: {
      get() {
        return this.$store.getters.showConfirmDelivery
      },
      set(value) {
        if (!this.isEmptyValue(this.currentOrder.uuid)) {
          this.$store.commit('setShowFastConfirmDelivery', value)
        }
      }
    },
    showToDeliveOrders: {
      get() {
        return this.$store.getters.getSearchToDeliveOrders
      },
      set(value) {
        this.$store.commit('setShowsearchToDeliveOrders', value)
      }
    },
    getSearchOrder() {
      return this.$store.getters.getQuickSearchOrder
    }
  },
  created() {
    this.unsubscribe = this.subscribeChanges()
  },
  beforeDestroy() {
    this.unsubscribe()
  },
  methods: {
    formatDate,
    formatPrice,
    extractPagingToken,
    createFieldFromDictionary,
    handleCommand(command) {
      if (this.isEmptyValue(this.metadataList)) {
        this.setFieldsList()
      }
      const index = this.quickOptions.findIndex(option => option.title === command.title)
      this.quickOptions[index].isVisible = true
      this.currentOptions = command
      this.listOrdersInvoiced(this.currentOptions)
    },
    closeSearch(command) {
      const index = this.quickOptions.findIndex(option => option.title === command.title)
      this.quickOptions[index].isVisible = false
      this.orderList = []
      this.input = ''
      this.$store.commit('updateValueOfField', {
        containerUuid: 'Aisle-Vendor-List',
        columnName: 'C_BPartner_ID',
        value: undefined
      })
      this.$store.commit('updateValueOfField', {
        containerUuid: 'Aisle-Vendor-List',
        columnName: 'DisplayColumn_C_BPartner_ID',
        value: undefined
      })
      this.$store.commit('updateValueOfField', {
        containerUuid: 'Aisle-Vendor-List',
        columnName: 'C_BPartner_ID_UUID',
        value: undefined
      })
    },
    openOrder(command) {
      const posUuid = this.$store.getters.posAttributes.currentPointOfSales.uuid
      const currentOrder = this.$store.getters.posAttributes.currentPointOfSales.currentOrder
      if (!this.isEmptyValue(this.getSearchOrder) && this.getSearchOrder.documentNo !== currentOrder.documentNo) {
        this.$store.state['pointOfSales/point/index'].conversionsList = []
        this.$store.dispatch('currentOrder', this.getSearchOrder)
        this.$store.dispatch('deleteAllCollectBox')
        this.$router.push({
          params: {
            ...this.$route.params
          },
          query: {
            ...this.$route.query,
            action: this.getSearchOrder.uuid
          }
        }, () => {})
        const orderUuid = this.getSearchOrder.uuid
        this.$store.dispatch('listPayments', { posUuid, orderUuid })
      }
      if (this.getSearchOrder.documentStatus.value === 'DR') {
        holdOrder({
          posUuid: this.currentPointOfSales.uuid,
          salesRepresentativeUuid: this.$store.getters['user/getUserUuid'],
          orderUuid: this.getSearchOrder.uuid
        })
          .then(response => {
            this.$message.success(this.$t('form.pos.generalNotifications.selectedOrder') + response.documentNo)
          })
          .catch(error => {
            this.$message({
              message: error.message,
              isShowClose: true,
              type: 'error'
            })
            console.warn(`Error Hold Order ${error.message}. Code: ${error.code}.`)
          })
      }
      this.closeSearch(command)
    },
    validaTypeDocument(type) {
      this.isStatus = type
    },
    openDelivery() {
      if (!this.isProcessed) {
        return
      }
      createShipment({
        posUuid: this.currentPointOfSales.uuid,
        orderUuid: this.currentOrder.uuid,
        salesRepresentativeUuid: this.currentPointOfSales.salesRepresentative.uuid
      })
        .then(shipment => {
          this.$store.commit('setShipment', shipment)
          shipments({ shipmentUuid: shipment.uuid })
            .then(response => {
              this.$store.commit('setDeliveryList', response.records)
            })
        })
        .catch(error => {
          this.$message({
            type: 'error',
            message: error.message,
            duration: 1500,
            showClose: true
          })
        })
    },
    notSubmitForm(event) {
      event.preventDefault()
      return false
    },
    handleChangePage(newPage) {
      this.tokenPage = this.tokenPage + '-' + newPage
      this.listOrdersInvoiced(this.currentOptions)
    },
    handleCurrentChange(row) {
      // close popover
      this.$store.commit('showListOrders', false)
      this.changeOrder = row
    },
    selectionChangeOrder() {
      const posUuid = this.$store.getters.posAttributes.currentPointOfSales.uuid
      const currentOrder = this.$store.getters.posAttributes.currentPointOfSales.currentOrder
      if (!this.isEmptyValue(this.changeOrder) && this.changeOrder.documentNo !== currentOrder.documentNo) {
        this.$store.state['pointOfSales/point/index'].conversionsList = []
        this.$store.dispatch('currentOrder', this.changeOrder)
        this.$store.dispatch('deleteAllCollectBox')
        this.$router.push({
          params: {
            ...this.$route.params
          },
          query: {
            ...this.$route.query,
            action: this.changeOrder.uuid
          }
        }, () => {})
        const orderUuid = this.$route.query.action
        this.$store.dispatch('listPayments', { posUuid, orderUuid })
      }
      this.clear()
    },
    subscribeChanges() {
      return this.$store.subscribe((mutation, state) => {
        if (mutation.type === 'updateValueOfField' && mutation.payload.columnName === 'C_BPartner_ID_UUID' && mutation.payload.containerUuid === 'Aisle-Vendor-List' && mutation.payload.value !== this.businessPartner) {
          this.businessPartner = mutation.payload.value
        }
        if (mutation.type === 'updateValueOfField' && mutation.payload.columnName === 'DateOrderedFrom' && mutation.payload.containerUuid === 'Aisle-Vendor-List' && mutation.payload.value !== this.dateOrdered) {
          this.dateOrdered = mutation.payload.value
        }
        if (mutation.type === 'updateValueOfField' &&
          !mutation.payload.columnName.includes('DisplayColumn') &&
          !mutation.payload.columnName.includes('_UUID') &&
          mutation.payload.containerUuid === this.metadata.containerUuid) {
          clearTimeout(this.timeOut)
          this.timeOut = setTimeout(() => {
            this.listOrdersInvoiced(this.currentOptions)
          }, 2000)
        }
      })
    },
    orderPrpcess(row) {
      const parametersList = [{
        columnName: 'C_Order_ID',
        value: row.id
      }]
      this.$store.dispatch('addParametersProcessPos', parametersList)
    },
    setFieldsList() {
      const fieldsList = [
        {
          ...this.sortFieldsListOrder,
          containerUuid: 'Aisle-Vendor-List'
        },
        {
          ...this.dateOrderedFrom,
          containerUuid: 'Aisle-Vendor-List'
        }
      ]
      const newfieldsList = []
      // Create Panel
      this.$store.dispatch('addPanel', {
        containerUuid: 'Aisle-Vendor-List',
        isCustomForm: false,
        uuid: this.metadata.uuid,
        panelType: this.metadata.panelType,
        fieldsList: fieldsList
      })
      // Product Code
      fieldsList.forEach(element => {
        this.createFieldFromDictionary(element)
          .then(response => {
            newfieldsList.push({
              ...response,
              containerUuid: 'Aisle-Vendor-List'
            })
          }).catch(error => {
            console.warn(`LookupFactory: Get Field From Server (State) - Error ${error.code}: ${error.message}.`)
          })
      })
      this.metadataList = newfieldsList
    },
    sortDate(listDate) {
      return listDate.sort((elementA, elementB) => {
        return new Date().setTime(new Date(elementB.dateOrdered).getTime()) - new Date().setTime(new Date(elementA.dateOrdered).getTime())
      })
    },
    listOrdersInvoiced(option) {
      this.isloading = true
      const values = {
        ...this.currentOptions.params,
        posUuid: this.$store.getters.posAttributes.currentPointOfSales.uuid,
        documentNo: this.input,
        pageToken: this.tokenPage,
        dateOrderedTo: this.dateOrdered,
        businessPartnerUuid: this.businessPartner,
        salesRepresentativeUuid: this.$store.getters['user/getUserUuid']
      }
      listOrders(
        values
      )
        .then(response => {
          this.isloading = false
          this.orderList = response.ordersList
          this.tokenPage = this.extractPagingToken(response.nextPageToken)
          this.total = response.recordCount
          // this.ordersInvoiced = response.ordersList
        })
        .catch(error => {
          this.isloading = false
          console.warn(`listOrdersFromServer: ${error.message}. Code: ${error.code}.`)
        })
    },
    clear() {
      this.openPopover = false
      this.input = ''
      this.$store.commit('updateValueOfField', {
        containerUuid: 'Aisle-Vendor-List',
        columnName: 'C_BPartner_ID',
        value: undefined
      })
      this.$store.commit('updateValueOfField', {
        containerUuid: 'Aisle-Vendor-List',
        columnName: 'DisplayColumn_C_BPartner_ID',
        value: undefined
      })
      this.$store.commit('updateValueOfField', {
        containerUuid: 'Aisle-Vendor-List',
        columnName: 'C_BPartner_ID_UUID',
        value: undefined
      })
    },
    newOrder() {
      if (!this.allowsCreateOrder) {
        const attributePin = {
          withLine: false,
          newOrder: true,
          customer: this.currentPointOfSales.templateCustomer.uuid,
          action: 'newOrder',
          type: 'actionPos',
          label: this.$t('form.pos.pinMessage.newOrder')
        }
        this.$store.dispatch('changePopoverOverdrawnInvoice', { attributePin, visible: true })
        this.visible = true
        return
      }
      this.$store.commit('setShowPOSCollection', false)
      const posUuid = this.currentPointOfSales.uuid
      const documentTypeUuid = this.$store.getters.getValueOfField({
        containerUuid: this.$route.meta.uuid,
        columnName: 'C_DocTypeTarget_ID_UUID'
      })
      this.$store.dispatch('createOrder', {
        posUuid,
        salesRepresentativeUuid: this.currentPointOfSales.salesRepresentative.uuid,
        documentTypeUuid
      })
        .then(response => {
          this.$store.dispatch('reloadOrder', { orderUuid: response.uuid })
          this.$router.push({
            params: {
              ...this.$route.params
            },
            query: {
              ...this.$route.query,
              action: response.uuid
            }
          }).then(() => {
            this.$store.commit('setShowPOSCollection', false)
            this.$store.dispatch('listOrdersFromServer', {
              posUuid: this.currentPointOfSales.uuid
            })
          }).catch(() => {})
        })
      this.$store.dispatch('changeFocusNewOrder', true)
    }
  }
}
</script>
