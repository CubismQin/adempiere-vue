// ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
// Copyright (C) 2017-Present E.R.P. Consultores y Asociados, C.A.
// Contributor(s): Yamel Senih ysenih@erpya.com www.erpya.com
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

// Get Instance for connection
import { request } from '@/utils/ADempiere/request'

/**
 * Object List from window
 * @param {string} windowUuid
 * @param {string} tabUuid
 * @param {array}  conditionsList
 * @param {array}  columnsList // TODO: Add support on adempiere-vue
 * @param {string} orderByClause
 * @param {string} pageToken
 */
export function getEntities({
  windowUuid,
  tabUuid,
  conditions = [],
  columns = [],
  attributes = [],
  sorting = [],
  pageToken,
  pageSize
}) {
  const filters = conditions.map(condition => {
    const { value, operator, columnName, valueTo, values } = condition
    return {
      column_name: columnName,
      value,
      operator,
      value_to: valueTo,
      values
    }
  })

  let attributesValues
  if (attributes) {
    attributesValues = attributes.map(attributeValue => {
      return {
        column_name: attributeValue.columnName,
        value: attributeValue.value
      }
    })
  }

  let sortingDefinition
  if (sorting) {
    sortingDefinition = sorting.map(sortValue => {
      return {
        column_name: sortValue.columnName,
        sorting: sortValue.sorting
      }
    })
  }

  return request({
    url: '/user-interface/window/entities',
    method: 'get',
    params: {
      window_uuid: windowUuid,
      tab_uuid: tabUuid,
      // DSL Query
      filters,
      columns,
      // replace sql values
      context_attributes: attributesValues,
      sorting: sortingDefinition,
      // Page Data
      page_token: pageToken,
      page_size: pageSize
    }
  })
    .then(response => {
      const { convertEntityList } = require('@/utils/ADempiere/apiConverts/persistence.js')
      return convertEntityList(response)
    })
}
