// ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
// Copyright (C) 2017-Present E.R.P. Consultores y Asociados, C.A.
// Contributor(s): Edwin Betancourt EdwinBetanc0urt@outlook.com www.erpya.com
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import language from '@/lang'

// constants
import { TABLE, TABLE_DIRECT } from '@/utils/ADempiere/references'

// api request methods
import {
  getEntity
} from '@/api/ADempiere/common/persistence.js'
import {
  requestDefaultValue,
  requestGetContextInfoValue
} from '@/api/ADempiere/window'
import {
  getPrivateAccess,
  lockPrivateAccess,
  unlockPrivateAccess
} from '@/api/ADempiere/actions/private-access'

// utils and helper methods
import { isEmptyValue } from '@/utils/ADempiere/valueUtils.js'
import { convertArrayKeyValueToObject } from '@/utils/ADempiere/valueFormat.js'
import { typeValue } from '@/utils/ADempiere/valueUtils.js'
import {
  parseContext,
  getPreference
} from '@/utils/ADempiere/contextUtils'
import { showMessage } from '@/utils/ADempiere/notification'

const actions = {
  /**
   * Set page number of pagination list
   * @param {string}  parameters.parentUuid
   * @param {string}  parameters.containerUuid
   * @param {integer} parameters.panelType
   * @param {string}  parameters.pageNumber
   */
  setPageNumber({ commit, state, dispatch, rootGetters }, parameters) {
    const {
      parentUuid, containerUuid, panelType = 'window', pageNumber,
      isAddRecord = false, isShowNotification = true
    } = parameters
    const data = state.recordSelection.find(recordItem => {
      return recordItem.containerUuid === containerUuid
    })
    commit('setPageNumber', {
      data: data,
      pageNumber: pageNumber
    })

    // refresh list table with data from server
    if (panelType === 'window') {
      dispatch('getDataListTab', {
        parentUuid,
        containerUuid,
        isAddRecord,
        isShowNotification
      })
        .catch(error => {
          console.warn(`Error getting data list tab. Message: ${error.message}, code ${error.code}.`)
        })
    } else if (panelType === 'browser') {
      if (!rootGetters.isNotReadyForSubmit(containerUuid)) {
        dispatch('getBrowserSearch', {
          containerUuid,
          isClearSelection: true
        })
      }
    }
  },
  /**
   * Insert new row bottom list table, used only from window
   * @param {string}  parentUuid
   * @param {string}  containerUuid
   * @param {boolean} isPanelValues, define if used values form panel
   * @param {boolean} isEdit, define if used values form panel
   */
  async addNewRow({ commit, getters, rootGetters, dispatch }, {
    parentUuid,
    containerUuid,
    isPanelValues = false,
    isEdit = true,
    isNew = true,
    fieldsList,
    row
  }) {
    const dataStore = getters.getDataRecordsList(containerUuid)
    let values = {}
    const currentNewRow = dataStore.find(itemData => {
      return isEmptyValue(itemData.UUID) && itemData.isNew
    })

    if (!isEmptyValue(currentNewRow)) {
      values = currentNewRow
      return values
    }

    if (isEmptyValue(row)) {
      const tabPanel = rootGetters.getPanel(containerUuid)

      if (isEmptyValue(fieldsList)) {
        fieldsList = tabPanel.fieldsList
      }
      // add row with default values to create new record
      if (isPanelValues) {
        // add row with values used from record in panel
        values = rootGetters.getColumnNamesAndValues({
          containerUuid,
          propertyName: 'value',
          isObjectReturn: true,
          isAddDisplayColumn: true,
          fieldsList
        })
      } else {
        values = rootGetters.getParsedDefaultValues({
          parentUuid,
          containerUuid,
          fieldsList,
          formatToReturn: 'object'
        })
      }
      values.isNew = isNew
      values.isEdit = isEdit
      values.isSendServer = false

      // get the link column name from the tab
      let linkColumnName = tabPanel.linkColumnName
      if (isEmptyValue(linkColumnName)) {
        // get the link column name from field list
        linkColumnName = tabPanel.fieldLinkColumnName
      }

      let valueLink
      // get context value if link column exists and does not exist in row
      if (!isEmptyValue(linkColumnName)) {
        valueLink = getPreference({
          parentUuid,
          containerUuid,
          columnName: linkColumnName
        })
        if (!isEmptyValue(valueLink)) {
          valueLink = parseInt(valueLink, 10)
        }
      }

      // get display column and/or sql value
      if (fieldsList.length) {
        fieldsList
          // TODO: Evaluate if is field is read only and FieldSelect
          .filter(itemField => {
            return itemField.componentPath === 'FieldSelect' ||
              typeValue(values[itemField.columnName]) === 'OBJECT' ||
              itemField.isSQLValue
          })
          .map(async itemField => {
            const { columnName, componentPath } = itemField
            let valueGetDisplayColumn = values[columnName]

            if (typeValue(values[columnName]) === 'OBJECT') {
              if (componentPath === 'FieldSelect') {
                values[columnName] = ' '
                values[itemField.displayColumnName] = ' '
              } else if (componentPath === 'FieldNumber') {
                values[columnName] = 0
              }
            }
            // overwrite value with column link
            if (!isEmptyValue(linkColumnName) && linkColumnName === columnName) {
              valueGetDisplayColumn = valueLink
              if (isEmptyValue(values[columnName])) {
                values[columnName] = valueGetDisplayColumn
              }
            }

            // break this itineration if is empty
            if (isEmptyValue(valueGetDisplayColumn)) {
              return
            }
            // always the values for these types of fields are integers
            // Table (18) or Table Direct (19)
            if ([TABLE.id, TABLE_DIRECT.id].includes(itemField.diplayType)) {
              valueGetDisplayColumn = parseInt(valueGetDisplayColumn, 10)
            } else {
              if (!isNaN(valueGetDisplayColumn)) {
                valueGetDisplayColumn = parseInt(valueGetDisplayColumn, 10)
              }
            }

            if (!isEmptyValue(valueGetDisplayColumn) &&
              typeValue(valueGetDisplayColumn) === 'OBJECT' &&
              valueGetDisplayColumn.isSQL) {
              // get value from Query
              valueGetDisplayColumn = await dispatch('getValueBySQL', {
                parentUuid,
                containerUuid,
                query: itemField.defaultValue
              })
              values[columnName] = valueGetDisplayColumn
            }

            // break to next itineration if not select field
            if (componentPath !== 'FieldSelect') {
              return
            }

            // get label (DisplayColumn) from vuex store
            const options = rootGetters.getLookupAll({
              parentUuid,
              containerUuid,
              tableName: itemField.reference.tableName,
              query: itemField.reference.query,
              directQuery: itemField.reference.directQuery,
              value: valueGetDisplayColumn
            })

            const option = options.find(itemOption => itemOption.key === valueGetDisplayColumn)
            // if there is a lookup option, assign the display column with the label
            if (option) {
              values[itemField.displayColumnName] = option.label
              // if (isEmptyValue(option.label) && !itemField.isMandatory) {
              //   values[columnName] = undefined
              // }
              return
            }
            if (linkColumnName === columnName) {
              // get context value if link column exists and does not exist in row
              const nameParent = getPreference({
                parentUuid,
                containerUuid,
                columnName: 'Name'
              })
              if (!isEmptyValue(nameParent)) {
                values[itemField.displayColumnName] = nameParent
                return
              }
            }
            // get value to displayed from server
            const { label } = await dispatch('getLookupItemFromServer', {
              parentUuid,
              containerUuid,
              columnName: itemField.columnName,
              tableName: itemField.reference.tableName,
              directQuery: itemField.reference.directQuery,
              value: valueGetDisplayColumn
            })
            values[itemField.displayColumnName] = label
          })
      }

      // overwrite value with column link
      if (isEmptyValue(values[linkColumnName])) {
        values[linkColumnName] = valueLink
      }
    } else {
      values = row
    }

    commit('addNewRow', {
      values,
      data: dataStore
    })
  },
  /**
   * Is load context in true when panel is set context
   * @param {string}  containerUuid
   */
  setIsloadContext({ commit, state }, { containerUuid }) {
    const dataStore = state.recordSelection.find(recordItem => {
      return recordItem.containerUuid === containerUuid
    })
    if (dataStore) {
      commit('setIsloadContext', {
        data: dataStore,
        isLoadedContext: true
      })
    }
  },
  /**
   * Set record, selection, page number, token, and record count, with container uuid
   * @param {string}  parameters.containerUuid
   * @param {array}   parameters.record
   * @param {array}   parameters.selection
   * @param {integer} parameters.pageNumber
   * @param {integer} parameters.recordCount
   * @param {string}  parameters.nextPageToken
   * @param {string}  parameters.panelType
   */
  setRecordSelection({ state, commit }, parameters) {
    const {
      parentUuid, containerUuid, panelType = 'window', record = [],
      query, whereClause, orderByClause,
      selection = [], pageNumber = 1, recordCount = 0, nextPageToken,
      originalNextPageToken, isAddRecord = false, isLoaded = true
    } = parameters

    const dataStore = state.recordSelection.find(recordItem => {
      return recordItem.containerUuid === containerUuid
    })

    const newDataStore = {
      parentUuid,
      containerUuid,
      record,
      selection,
      pageNumber,
      recordCount,
      nextPageToken,
      originalNextPageToken,
      panelType,
      isLoaded,
      isLoadedContext: false,
      query,
      whereClause,
      orderByClause
    }

    if (dataStore) {
      if (isAddRecord) {
        newDataStore.record = dataStore.record.concat(newDataStore.record)
      }
      commit('setRecordSelection', {
        dataStore,
        newDataStore
      })
    } else {
      commit('addRecordSelection', newDataStore)
    }
  },
  /**
   * Set selection in data list associated in container
   * @param {string} containerUuid
   * @param {array} selection
   */
  setSelection({ commit, getters }, {
    containerUuid,
    selection = []
  }) {
    const recordSelection = getters.getDataRecordAndSelection(containerUuid)
    commit('setSelection', {
      newSelection: selection,
      data: recordSelection
    })
  },
  /**
   * Delete record result in container
   * @param {string}  viewUuid // As parentUuid in window
   * @param {array}   withOut
   * @param {boolean} isNew
   */
  deleteRecordContainer({ commit, state, dispatch }, {
    viewUuid,
    withOut = [],
    isNew = false
  }) {
    const setNews = []
    const record = state.recordSelection.filter(itemRecord => {
      // ignore this uuid
      if (withOut.includes(itemRecord.containerUuid)) {
        return true
      }
      // remove window and tabs data
      if (itemRecord.parentUuid) {
        if (isNew) {
          setNews.push(itemRecord.containerUuid)
        }
        return itemRecord.parentUuid !== viewUuid
      }
      // remove browser data
      return itemRecord.containerUuid !== viewUuid
    })
    commit('deleteRecordContainer', record)
    dispatch('setTabSequenceRecord', [])

    if (setNews.length) {
      setNews.forEach(uuid => {
        dispatch('setRecordSelection', {
          parentUuid: viewUuid,
          containerUuid: uuid
        })
      })
    }
  },
  /**
   * @param {string} tableName
   * @param {string} recordUuid
   * @param {number} recordId
   */
  getEntity({ commit }, {
    tableName,
    recordUuid,
    recordId
  }) {
    return new Promise(resolve => {
      getEntity({
        tableName,
        recordUuid,
        recordId
      })
        .then(responseGetEntity => {
          resolve(responseGetEntity.attributes)
        })
        .catch(error => {
          console.warn(`Error Get Entity ${error.message}. Code: ${error.code}.`)
        })
    })
  },

  /**
   * @param {string} parentUuid
   * @param {string} containerUuid
   * @param {string} query
   */
  getValueBySQL({ commit }, {
    parentUuid,
    containerUuid,
    query
  }) {
    // TODO: Change to promise all
    return new Promise(resolve => {
      if (query.includes('@')) {
        query = parseContext({
          parentUuid,
          containerUuid,
          isSQL: true,
          value: query
        }).query
      }

      requestDefaultValue(query)
        .then(defaultValueResponse => {
          resolve(defaultValueResponse)
        })
        .catch(error => {
          console.warn(`Error getting default value from server. Error code ${error.code}: ${error.message}.`)
        })
    })
  },
  /**
   * TODO: Add support to tab children
   * @param {string} parentUuid
   * @param {string} containerUuid
   * @param {boolean}  isEdit, if the row displayed to edit mode
   * @param {boolean}  isNew, if insert data to new row
   * @param {objec}  row, new data to change
   */
  notifyRowTableChange({ commit, getters, rootGetters }, {
    parentUuid,
    containerUuid,
    isEdit = true,
    isNew,
    row
  }) {
    let values = {}
    if (row) {
      values = row
    } else {
      values = rootGetters.getColumnNamesAndValues({
        parentUuid,
        containerUuid,
        propertyName: 'value',
        isObjectReturn: true,
        isAddDisplayColumn: true
      })
    }
    if (Array.isArray(values)) {
      values = convertArrayKeyValueToObject({
        arrayToConvert: values
      })
    }

    const currentRow = getters.getRowData({
      containerUuid,
      recordUuid: values.UUID
    })

    const newRow = {
      ...values,
      isEdit
    }

    commit('notifyRowTableChange', {
      isNew,
      newRow,
      row: currentRow
    })
  },
  notifyCellTableChange({ commit, state, dispatch, rootGetters }, {
    parentUuid,
    containerUuid,
    field,
    columnName,
    rowKey,
    keyColumn,
    panelType = 'window',
    isSendToServer = true,
    isSendCallout = true,
    newValue,
    displayColumnName,
    withOutColumnNames = []
  }) {
    // dispatch('setPreferenceContext', {
    //   parentUuid,
    //   containerUuid,
    //   columnName,
    //   value: newValue
    // })
    const recordSelection = state.recordSelection.find(recordItem => {
      return recordItem.containerUuid === containerUuid
    })
    let row = {}
    if (!isEmptyValue(field.tableIndex)) {
      row = recordSelection.record[field.tableIndex]
    } else {
      row = recordSelection.record.find(itemRecord => {
        return itemRecord[keyColumn] === rowKey
      })
    }

    // the field has not changed, then the action is broken
    if (row[columnName] === newValue) {
      return
    }
    commit('notifyCellTableChange', {
      row,
      value: newValue,
      columnName,
      displayColumnName
    })

    if (panelType === 'browser') {
      const rowSelection = recordSelection.selection.find(itemRecord => {
        return itemRecord[keyColumn] === rowKey
      })
      commit('notifyCellSelectionChange', {
        row: rowSelection,
        value: newValue,
        columnName,
        displayColumnName
      })
    } else if (panelType === 'window') {
      // request callouts
      if (isSendCallout && !withOutColumnNames.includes(field.columnName) &&
        !isEmptyValue(newValue) && !isEmptyValue(field.callout)) {
        withOutColumnNames.push(field.columnName)
        dispatch('runCallout', {
          parentUuid,
          containerUuid,
          tableName: field.tableName,
          columnName: field.columnName,
          callout: field.callout,
          value: newValue,
          valueType: field.valueType,
          withOutColumnNames,
          row,
          inTable: true
        })
      }

      if (isSendToServer) {
        const fieldNotReady = rootGetters.isNotReadyForSubmit(containerUuid, row)
        if (!fieldNotReady) {
          if (!isEmptyValue(row.UUID)) {
            dispatch('updateCurrentEntityFromTable', {
              parentUuid,
              containerUuid,
              row
            })
          } else {
            dispatch('createEntityFromTable', {
              parentUuid,
              containerUuid,
              row
            })
          }
        } else {
          const fieldsEmpty = rootGetters.getFieldsListEmptyMandatory({
            containerUuid,
            row
          })
          showMessage({
            message: language.t('notifications.mandatoryFieldMissing') + fieldsEmpty,
            type: 'info'
          })
        }
      }
    }
  },
  getContextInfoValueFromServer({ commit, getters }, {
    contextInfoId,
    contextInfoUuid,
    sqlStatement
  }) {
    // const contextInforField = getters.getContextInfoField(contextInfoUuid, sqlStatement)
    // if (contextInforField) {
    //   return contextInforField
    // }
    return requestGetContextInfoValue({
      id: contextInfoId,
      uuid: contextInfoUuid,
      query: sqlStatement
    })
      .then(contextInfoResponse => {
        commit('setContextInfoField', {
          contextInfoUuid,
          sqlStatement,
          ...contextInfoResponse
        })
        return contextInfoResponse
      })
      .catch(error => {
        console.warn(`Error ${error.code} getting context info value for field ${error.message}.`)
      })
  },
  getPrivateAccessFromServer({ rootGetters }, {
    tableName,
    recordId,
    recordUuid
  }) {
    return getPrivateAccess({
      tableName,
      recordId,
      recordUuid
    })
      .then(privateAccessResponse => {
        return {
          ...privateAccessResponse
        }
      })
      .catch(error => {
        console.warn(`Error get private access: ${error.message}. Code: ${error.code}.`)
      })
  },
  lockRecord({ rootGetters }, {
    tableName,
    recordId,
    recordUuid
  }) {
    return lockPrivateAccess({
      tableName,
      recordId,
      recordUuid
    })
      .then(privateAccessResponse => {
        if (!isEmptyValue(privateAccessResponse.recordId)) {
          const recordLocked = {
            isPrivateAccess: true,
            isLocked: true,
            ...privateAccessResponse
          }
          showMessage({
            title: language.t('notifications.succesful'),
            message: language.t('notifications.recordLocked'),
            type: 'success'
          })
          return recordLocked
        }
      })
      .catch(error => {
        showMessage({
          title: language.t('notifications.error'),
          message: language.t('login.unexpectedError') + error.message,
          type: 'error'
        })
        console.warn(`Error lock private access: ${error.message}. Code: ${error.code}.`)
      })
  },
  unlockRecord({ rootGetters }, {
    tableName,
    recordId,
    recordUuid
  }) {
    return unlockPrivateAccess({
      tableName,
      recordId,
      recordUuid
    })
      .then(privateAccessResponse => {
        if (!isEmptyValue(privateAccessResponse.recordId)) {
          const recordUnlocked = {
            isPrivateAccess: true,
            isLocked: false,
            ...privateAccessResponse
          }
          showMessage({
            title: language.t('notifications.succesful'),
            message: language.t('notifications.recordUnlocked'),
            type: 'success'
          })
          return recordUnlocked
        }
      })
      .catch(error => {
        showMessage({
          title: language.t('notifications.error'),
          message: language.t('login.unexpectedError') + error.message,
          type: 'error'
        })
        console.warn(`Error unlock private access: ${error.message}. Code: ${error.code}.`)
      })
  },
  resetStateBusinessData({ commit }) {
    commit('resetStateContainerInfo')
    commit('setInitialContext', {})
    commit('resetStateTranslations')
    commit('resetStateBusinessData')
    commit('resetContextMenu')
    commit('resetStateTranslations')
    commit('resetStateLookup')
    commit('resetStateProcessControl')
    commit('resetStateUtils')
    commit('resetStateWindowControl')
  }
}

export default actions
