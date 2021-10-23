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

import evaluator from '@/utils/ADempiere/evaluator'
import { isEmptyValue, parsedValueComponent } from '@/utils/ADempiere/valueUtils'
import { getContext, getParentFields, getPreference, parseContext } from '@/utils/ADempiere/contextUtils'
import REFERENCES, { BUTTON, DEFAULT_SIZE, isHiddenField } from '@/utils/ADempiere/references'
import { FIELD_OPERATORS_LIST } from '@/utils/ADempiere/dataUtils'

/**
 * Generate field to app
 * @param {object}  fieldToGenerate
 * @param {object}  moreAttributes, additional attributes
 * @param {boolean} typeRange, indicate if this field is a range used as _To
 */
export function generateField({
  fieldToGenerate,
  moreAttributes,
  typeRange = false,
  isSOTrxMenu
}) {
  let isShowedFromUser = false
  let isSQLValue = false
  // verify if it no overwrite value with ...moreAttributes
  if (moreAttributes.isShowedFromUser) {
    isShowedFromUser = moreAttributes.isShowedFromUser
  }

  const componentReference = evalutateTypeField(fieldToGenerate.displayType)
  let evaluatedLogics = {
    isDisplayedFromLogic: fieldToGenerate.isDisplayed,
    isMandatoryFromLogic: false,
    isReadOnlyFromLogic: false
  }

  let parentFieldsList = []
  let parsedDefaultValue = fieldToGenerate.defaultValue
  let parsedDefaultValueTo = fieldToGenerate.defaultValueTo
  let operator = 'EQUAL'
  let isNumericField = componentReference.componentPath === 'FieldNumber'
  let isTranslatedField = fieldToGenerate.isTranslated
  let isComparisonField = false // to list operators comparison
  let operatorsList = []
  if (moreAttributes.isAdvancedQuery) {
    isNumericField = false
    isTranslatedField = false
    parsedDefaultValue = undefined
    parsedDefaultValueTo = undefined

    // mandatory, read only and displayed is changed to FilterFields component
    evaluatedLogics = {
      isDisplayedFromLogic: true,
      isMandatoryFromLogic: false,
      isReadOnlyFromLogic: false
    }
    fieldToGenerate.isDisplayed = true
    fieldToGenerate.isReadOnly = false
    // Is mandatory to showed available filter fields
    fieldToGenerate.isMandatory = false

    // set field operators list
    isComparisonField = !['FieldBinary', 'FieldButton', 'FieldImage'].includes(componentReference.componentPath)
    if (isComparisonField) {
      const operatorsField = FIELD_OPERATORS_LIST.find(item => {
        return item.componentPath === componentReference.componentPath
      })
      if (operatorsField) {
        operatorsList = operatorsField.operatorsList
      }
    }

    if (['FieldText', 'FieldTextLong'].includes(componentReference.componentPath)) {
      operator = 'LIKE'
    }
  } else {
    parsedDefaultValue = getDefaultValue({
      ...fieldToGenerate,
      parentUuid: moreAttributes.parentUuid,
      containerUuid: moreAttributes.containerUuid,
      componentPath: componentReference.componentPath,
      isSOTrxMenu
    })

    if (String(fieldToGenerate.defaultValue).includes('@SQL=')) {
      isShowedFromUser = true
      isSQLValue = true
    }

    // VALUE TO
    if (fieldToGenerate.isRange) {
      parsedDefaultValueTo = getDefaultValue({
        ...fieldToGenerate,
        parentUuid: moreAttributes.parentUuid,
        containerUuid: moreAttributes.containerUuid,
        componentPath: componentReference.componentPath,
        defaultValue: fieldToGenerate.defaultValueTo,
        columnName: `${fieldToGenerate.columnName}_To`,
        elementName: `${fieldToGenerate.elementName}_To`,
        isSOTrxMenu
      })
    }

    parentFieldsList = getParentFields(fieldToGenerate)

    // evaluate logics (diplayed, mandatory, readOnly)
    evaluatedLogics = getEvaluatedLogics({
      parentUuid: moreAttributes.parentUuid,
      containerUuid: moreAttributes.containerUuid,
      ...fieldToGenerate
    })
  }

  const field = {
    ...fieldToGenerate,
    ...moreAttributes,
    columnNameTo: undefined,
    elementNameTo: undefined,
    isSOTrxMenu,
    // displayed attributes
    componentPath: componentReference.componentPath,
    isSupported: componentReference.isSupported,
    size: componentReference.size || DEFAULT_SIZE,
    // TODO: Property 'displayColumn' is @depecated
    displayColumn: undefined, // link to value from selects and table
    displayColumnName: `DisplayColumn_${fieldToGenerate.columnName}`, // key to display column
    // value attributes
    value: String(parsedDefaultValue).trim() === '' ? undefined : parsedDefaultValue,
    oldValue: parsedDefaultValue,
    valueTo: parsedDefaultValueTo,
    parsedDefaultValue,
    parsedDefaultValueTo,
    // logics to app (isDisplayedFromLogic, isMandatoryFromLogic, isReadOnlyFromLogic)
    ...evaluatedLogics,
    //
    parentFieldsList,
    dependentFieldsList: [],
    // TODO: Add support on server
    // app attributes
    isShowedFromUser,
    isShowedFromUserDefault: isShowedFromUser, // set this value when reset panel
    isShowedTableFromUser: fieldToGenerate.isDisplayed,
    isFixedTableColumn: false,
    valueType: componentReference.valueType, // value type to convert with gGRPC
    isSQLValue,
    // Advanced query
    operator, // current operator
    oldOperator: undefined, // old operator
    defaultOperator: operator,
    operatorsList,
    // popover's
    isComparisonField,
    isNumericField,
    isTranslatedField
  }

  // Overwrite some values
  if (field.isRange) {
    field.operator = 'GREATER_EQUAL'
    field.columnNameTo = `${field.columnName}_To`
    field.elementNameTo = `${field.elementNameTo}_To`
    if (typeRange) {
      field.uuid = `${field.uuid}_To`
      field.columnName = field.columnNameTo
      field.elementName = field.elementNameTo
      field.name = `${field.name} To`
      field.value = parsedDefaultValueTo
      field.defaultValue = field.defaultValueTo
      field.parsedDefaultValue = field.parsedDefaultValueTo
      field.operator = 'LESS_EQUAL'
      field.sequence = field.sequence + 1

      // if field with value displayed in main panel
      if (!isEmptyValue(parsedDefaultValueTo)) {
        field.isShowedFromUser = true
      }
    }
  }

  // if field with value displayed in main panel
  if (!typeRange && !isEmptyValue(parsedDefaultValue)) {
    field.isShowedFromUser = true
  }

  // hidden field type button
  if (isHiddenField(field.displayType)) {
    field.isDisplayedFromLogic = false
    field.isDisplayed = false
  }

  return field
}

/**
 * Evaluate logics to definition field
 * @param {object}
 */
export function getEvaluatedLogics({
  parentUuid,
  containerUuid,
  isDisplayed = true,
  displayLogic,
  mandatoryLogic,
  readOnlyLogic
}) {
  // evaluate logics
  const commonParameters = {
    parentUuid,
    containerUuid,
    context: getContext
  }

  let isDisplayedFromLogic = isDisplayed
  if (!isEmptyValue(displayLogic)) {
    isDisplayedFromLogic = evaluator.evaluateLogic({
      ...commonParameters,
      logic: displayLogic
    })
  }

  let isMandatoryFromLogic = false
  if (!isEmptyValue(mandatoryLogic)) {
    isMandatoryFromLogic = evaluator.evaluateLogic({
      ...commonParameters,
      logic: mandatoryLogic
    })
  }

  let isReadOnlyFromLogic = false
  if (!isEmptyValue(readOnlyLogic)) {
    isReadOnlyFromLogic = evaluator.evaluateLogic({
      ...commonParameters,
      logic: readOnlyLogic
    })
  }

  return {
    isDisplayedFromLogic,
    isMandatoryFromLogic,
    isReadOnlyFromLogic
  }
}

/**
 * Get parsed default value to set into field
 * @param {object}  field
 * @param {boolean} isSOTrxMenu
 */
export function getDefaultValue({
  parentUuid,
  containerUuid,
  isSOTrxMenu,
  columnName,
  elementName,
  componentPath,
  displayType,
  defaultValue,
  isMandatory,
  isKey
}) {
  let parsedDefaultValue = defaultValue

  if (String(parsedDefaultValue).includes('@') &&
    String(parsedDefaultValue).trim() !== '-1') {
    parsedDefaultValue = parseContext({
      parentUuid,
      containerUuid,
      columnName,
      value: parsedDefaultValue,
      isSOTrxMenu
    }).value
  }

  if (isEmptyValue(parsedDefaultValue) && !isKey &&
    String(parsedDefaultValue).trim() !== '-1') {
    parsedDefaultValue = getPreference({
      parentUuid,
      containerUuid,
      columnName
    })

    // search value preference with elementName
    if (!isEmptyValue(elementName) &&
      isEmptyValue(parsedDefaultValue)) {
      parsedDefaultValue = getPreference({
        parentUuid,
        containerUuid,
        columnName: elementName
      })
    }
  }

  parsedDefaultValue = parsedValueComponent({
    columnName,
    componentPath,
    displayType,
    isMandatory,
    value: parsedDefaultValue
  })

  return parsedDefaultValue
}

/**
 * Evaluate by the ID and name of the reference to call the component type
 * @param {integer} displayTypeId, received from data
 * @param {boolean} isAllInfo
 * @return string type, assigned value to folder after evaluating the parameter
 */
export function evalutateTypeField(displayTypeId, isAllInfo = true) {
  const component = REFERENCES.find(reference => displayTypeId === reference.id)
  if (isAllInfo) {
    return component
  }
  return component.componentPath
}

/**
 * Determinate if field is displayed
 * @param {boolean} isActive
 * @param {boolean} isDisplayed
 * @param {boolean} isDisplayedFromLogic
 * @param {boolean} isQueryCriteria
 * @param {string}  panelType
 * @returns {boolean}
 */
export function fieldIsDisplayed({
  // standard
  panelType,
  isActive,
  isDisplayed,
  displayType,
  // panel
  isQueryCriteria,
  isKey,
  // table
  isDisplayedGrid,
  // other
  isDisplayedFromLogic
}, isTable = false) {
  // button field not showed
  if (displayType === BUTTON.id) {
    return false
  }

  // verify if field is active
  if (!isActive || !isDisplayed) {
    return false
  }

  // window (record navigation and tab childs), browser (table result)
  if (isTable) {
    return fieldIsDisplayedTable({
      // standard
      panelType,
      // table,
      isKey,
      isDisplayedGrid,
      // other
      isDisplayedFromLogic
    })
  }

  // window, process and report, browser (table result)
  return fieldIsDisplayedPanel({
    // standard
    panelType,
    // panel
    isQueryCriteria,
    // other
    isDisplayedFromLogic
  })
}

/**
 * Determinate if field is displayed in panel
 * @returns {boolean}
 */
export function fieldIsDisplayedPanel({
  // standard
  panelType,
  // panel
  isQueryCriteria,
  // other
  isDisplayedFromLogic
}) {
  // browser query criteria
  if (panelType === 'browser') {
    return isQueryCriteria
  }

  // window, process and report
  return isDisplayedFromLogic
}

/**
 * Determinate if field/column is displayed in table
 * @returns {boolean}
 */
export function fieldIsDisplayedTable({
  // standard
  panelType,
  // table,
  isKey,
  isDisplayedGrid,
  // other
  isDisplayedFromLogic
}) {
  // window table
  if (panelType === 'window' && !isDisplayedGrid) {
    return false
  }

  // window , browser (table) result
  return isDisplayedFromLogic &&
    !isKey
}

// Convert action to action name for route
export function convertAction(action) {
  const actionAttributes = {
    name: '',
    icon: '',
    hidden: false,
    isIndex: false,
    component: () => import('@/views/ADempiere/Unsupported')
  }
  switch (action) {
    case 'B':
      actionAttributes.name = 'workbech'
      actionAttributes.icon = 'peoples'
      break
    case 'F':
      actionAttributes.name = 'workflow'
      actionAttributes.icon = 'example'
      actionAttributes.component = () => import('@/views/ADempiere/Workflow')
      break
    case 'P':
      actionAttributes.name = 'process'
      actionAttributes.icon = 'component'
      actionAttributes.component = () => import('@/views/ADempiere/Process')
      break
    case 'R':
      actionAttributes.name = 'report'
      actionAttributes.icon = 'skill'
      actionAttributes.component = () => import('@/views/ADempiere/Process')
      break
    case 'S':
      actionAttributes.name = 'browser'
      actionAttributes.icon = 'search'
      actionAttributes.component = () => import('@/views/ADempiere/Browser')
      break
    case 'T':
      actionAttributes.name = 'task'
      actionAttributes.icon = 'size'
      break
    case 'W':
      actionAttributes.name = 'window'
      actionAttributes.icon = 'tab'
      actionAttributes.component = () => import('@/views/ADempiere/Window')
      break
    case 'X':
      actionAttributes.name = 'form'
      actionAttributes.icon = 'form'
      actionAttributes.component = () => import('@/views/ADempiere/Form')
      break
    default:
      actionAttributes.name = 'summary'
      actionAttributes.icon = 'nested'
      // actionAttributes.hidden = true
      actionAttributes.isIndex = true
      actionAttributes.component = () => import('@/views/ADempiere/Summary')
      break
  }
  return actionAttributes
}
