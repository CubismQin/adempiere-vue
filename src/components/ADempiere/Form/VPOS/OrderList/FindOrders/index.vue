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
  <el-container>
    <el-header style="height: 2%;">
      <p style="text-align: center;"> <b> {{ data.title }} </b></p>
      <slot />
    </el-header>
    <el-main>
      <el-table
        v-loading="isLoadingTable"
        :data="dataList"
        height="250"
        style="width: 100%"
        border
        :empty-text="$t('form.byInvoice.emptyList')"
        fit
        highlight-current-row
        @current-change="handleCurrentChange"
      >
        <el-table-column
          prop="documentNo"
          width="155"
        >
          <template slot="header" slot-scope="scope">
            {{ $t('form.byInvoice.documentNo') }}
            <el-button-group
              style="display: inline-grid;vertical-align: inherit;"
            >
              <el-button
                type="text"
                icon="el-icon-caret-top"
                style="margin: 0px;padding: 0px;"
                @click="sortAscendingTable(dataList, scope.column.property)"
              />
              <el-button
                type="text"
                icon="el-icon-caret-bottom"
                style="margin: 0px;padding: 0px;"
                @click="sortDescendingTable(dataList, scope.column.property)"
              />
            </el-button-group>
          </template>
        </el-table-column>
        <el-table-column
          width="155"
        >
          <template slot="header" slot-scope="scope">
            Fecha de Orden
            <el-button-group
              style="display: inline-grid;vertical-align: inherit;"
            >
              <el-button
                type="text"
                icon="el-icon-caret-top"
                style="margin: 0px;padding: 0px;"
                @click="sortAscendingDate(dataList, scope.column.property)"
              />
              <el-button
                type="text"
                icon="el-icon-caret-bottom"
                style="margin: 0px;padding: 0px;"
                @click="sortDescendingDate(dataList, scope.column.property)"
              />
            </el-button-group>
          </template>
          <template slot-scope="scope">
            {{ formatDate(scope.row.dateOrdered) }}
          </template>
        </el-table-column>

        <el-table-column
          prop="businessPartner.name"
          min-width="160"
        >
          <template slot="header">
            {{ $t('form.byInvoice.businessPartner') }}
            <el-button-group
              style="display: inline-grid;vertical-align: inherit;"
            >
              <el-button
                type="text"
                icon="el-icon-caret-top"
                style="margin: 0px;padding: 0px;"
                @click="sortAscendingTable(dataList, 'businessPartner', 'name')"
              />
              <el-button
                type="text"
                icon="el-icon-caret-bottom"
                style="margin: 0px;padding: 0px;"
                @click="sortDescendingTable(dataList, 'businessPartner', 'name')"
              />
            </el-button-group>
          </template>
        </el-table-column>

        <el-table-column
          prop="salesRepresentative.name"
          min-width="170"
        >
          <template slot="header">
            {{ $t('form.byInvoice.salesRepresentative') }}
            <el-button-group
              style="display: inline-grid;vertical-align: inherit;"
            >
              <el-button
                type="text"
                icon="el-icon-caret-top"
                style="margin: 0px;padding: 0px;"
                @click="sortAscendingTable(dataList, 'salesRepresentative', 'name')"
              />
              <el-button
                type="text"
                icon="el-icon-caret-bottom"
                style="margin: 0px;padding: 0px;"
                @click="sortDescendingTable(dataList, 'salesRepresentative', 'name')"
              />
            </el-button-group>
          </template>
        </el-table-column>
        <el-table-column
          width="100"
        >
          <template slot="header">
            {{ $t('table.ProcessActivity.Status') }}
            <el-button-group
              style="display: inline-grid;vertical-align: inherit;"
            >
              <el-button
                type="text"
                icon="el-icon-caret-top"
                style="margin: 0px;padding: 0px;"
                @click="sortAscendingTable(dataList, 'documentStatus', 'name')"
              />
              <el-button
                type="text"
                icon="el-icon-caret-bottom"
                style="margin: 0px;padding: 0px;"
                @click="sortDescendingTable(dataList, 'documentStatus', 'name')"
              />
            </el-button-group>
          </template>
          <template slot-scope="scope">
            <el-tag
              :type="tagStatus(scope.row.documentStatus.value)"
            >
              {{ scope.row.documentStatus.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          align="right"
          width="150"
        >
          <template slot="header">
            {{ $t('form.productInfo.grandTotal') }}
            <el-button-group
              style="display: inline-grid;vertical-align: inherit;"
            >
              <el-button
                type="text"
                icon="el-icon-caret-top"
                style="margin: 0px;padding: 0px;"
                @click="sortAscendingTable(dataList, 'grandTotal')"
              />
              <el-button
                type="text"
                icon="el-icon-caret-bottom"
                style="margin: 0px;padding: 0px;"
                @click="sortDescendingTable(dataList, 'grandTotal')"
              />
            </el-button-group>
          </template>
          <template slot-scope="scope">
            {{ formatPrice(scope.row.grandTotal, scope.row.priceList.currency.iso_code) }}
          </template>
        </el-table-column>
      </el-table>
    </el-main>
  </el-container>
</template>

<script>
import {
  formatDate,
  formatPrice
} from '@/utils/ADempiere/valueFormat.js'
import { extractPagingToken } from '@/utils/ADempiere/valueUtils.js'

export default {
  name: 'FindOrders',
  props: {
    metadata: {
      type: Object,
      default: () => {
        return {
          panelType: 'from',
          uuid: 'Find-Orders',
          containerUuid: 'Find-Orders'
        }
      }
    },
    showField: {
      type: Boolean,
      default: false
    },
    data: {
      type: Object,
      default: () => {
        return {}
      }
    },
    dataList: {
      type: Array,
      default: () => []
    },
    isLoadingTable: {
      type: Boolean,
      default: true
    },
    params: {
      type: Object,
      default: () => {
        return {}
      }
    },
    showPanel: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      metadataList: {},
      total: 0,
      currentPage: 1,
      tokenPage: '',
      input: '',
      isCustomForm: true,
      businessPartner: '',
      timeOut: null,
      changeOrder: {},
      isloading: true,
      ordersInvoiced: [],
      dateOrdered: '',
      openPopover: false
    }
  },
  computed: {
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
    }
  },
  methods: {
    formatDate,
    formatPrice,
    extractPagingToken,
    sortAscendingDate(listDate) {
      return listDate.sort((elementA, elementB) => {
        return new Date().setTime(new Date(elementB.dateOrdered).getTime()) - new Date().setTime(new Date(elementA.dateOrdered).getTime())
      })
    },
    sortDescendingDate(listDate) {
      return listDate.sort((elementA, elementB) => {
        return new Date().setTime(new Date(elementA.dateOrdered).getTime()) - new Date().setTime(new Date(elementB.dateOrdered).getTime())
      })
    },
    sortDescendingTable(listDate, column, params) {
      return listDate.sort((element, item) => {
        if ((!this.isEmptyValue(params) && element[column][params] > item[column][params]) || element[column] > item[column]) {
          return 1
        }
        if ((!this.isEmptyValue(params) && element[column][params] < item[column][params]) || (element[column] < item[column])) {
          return -1
        }
        return 0
      })
    },
    sortAscendingTable(listDate, column, params) {
      return listDate.sort((element, item) => {
        if ((!this.isEmptyValue(params) && element[column][params] < item[column][params]) || (element[column] < item[column])) {
          return 1
        }
        if ((!this.isEmptyValue(params) && element[column][params] > item[column][params]) || (element[column] > item[column])) {
          return -1
        }
        return 0
      })
    },
    notSubmitForm(event) {
      event.preventDefault()
      return false
    },
    handleChangePage(newPage) {
      this.tokenPage = this.tokenPage + '-' + newPage
    },
    handleCurrentChange(row) {
      // close popover
      this.$store.commit('setQuickSearchOrder', row)
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
    orderPrpcess(row) {
      const parametersList = [{
        columnName: 'C_Order_ID',
        value: row.id
      }]
      this.$store.dispatch('addParametersProcessPos', parametersList)
    },
    clear() {
      this.$store.commit('setShowsearchToDeliveOrders', false)
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
    }
  }
}
</script>
