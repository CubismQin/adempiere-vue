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

import { isEmptyValue } from '@/utils/ADempiere/valueUtils.js'

class Filters {
  constructor() {
    this.filtersList = new Map()
  }

  static newInstance() {
    return new Filters()
  }

  /**
   * Set filter with columnName, operator and value
   * @param {string} columnName as key filter
   * @param {string} operator
   * @returns {class} Filters
   */
  withFilter({ columnName, operator = 'equal', value }) {
    if (isEmptyValue(value) || isEmptyValue(columnName)) {
      return this
    }
    this.filtersList.set(columnName, {
      columnName,
      operator,
      value
    })
    return this
  }

  /**
   * Get filter with columnName key
   * @param {string} columnName
   * @returns {object}
   */
  getFilter(columnName) {
    return this.filtersList.get(columnName)
  }

  /**
   * Set value with columnName key
   * @param {string} columnName as key filter
   * @param {string} value
   * @returns {class} Filters
   */
  setValue({ columnName, value }) {
    let filter = this.getFilter(columnName)
    if (isEmptyValue(filter)) {
      filter = {
        columnName,
        operator: 'equal'
      }
    }

    this.filtersList.set(columnName, {
      ...filter,
      value
    })
    return this
  }

  /**
   * Set operator with columnName key
   * @param {string} columnName as key filter
   * @param {string} operator
   * @returns {class} Filters
   */
  setOperator({ columnName, operator = 'equal' }) {
    let filter = this.getFilter(columnName)
    if (isEmptyValue(filter)) {
      filter = {
        columnName
      }
    }

    this.filtersList.set(columnName, {
      ...filter,
      operator
    })

    return this
  }

  /**
   * Convert URI to filters
   * @param {array} filters
   * @returns {object} data
   */
  convertFilters(filters) {
    if (!filters) {
      return
    }

    const delimiter = ','
    const data = {}
    filters.forEach(str => {
      // TODO: Limit to first delimiter
      // const items = filter.split(delimiter)
      const index = str.indexOf(delimiter)
      const columnName = str.substr(0, index)
      const value = str.substr(index + 1)

      data[columnName] = value
    })

    return data
  }

  /**
   * Get array of objects, [{ columnName, value, operator }]
   * @returns array objects
   */
  getAsArray() {
    return Array.from(this.filtersList.values())
  }

  get asArray() {
    return this.getAsArray()
  }

  /**
   * Get array to uri
   * @returns string
   */
  getAsUri() {
    return encodeURIComponent(
      JSON.stringify(
        this.getAsArray()
      )
    )
  }

  get asUri() {
    return this.getAsUri()
  }
}

export default Filters
