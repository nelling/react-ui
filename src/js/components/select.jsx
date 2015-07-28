'use strict'

require('../../less/form-control.less')
require('../../less/select.less')

import React from 'react'
import classnames from 'classnames'
import { toArray, substitute } from '../utils/strings'
import { getOuterHeight, overView, withoutTransition } from '../utils/dom'
import clickAway from '../higherorder/clickaway'
import getGrid from '../higherorder/grid'

@clickAway
@getGrid
class Select extends React.Component {
  static displayName = 'Select'

  static propTypes = {
    cache: React.PropTypes.bool,
    className: React.PropTypes.string,
    data: React.PropTypes.oneOfType([
      React.PropTypes.array,
      React.PropTypes.func
    ]),
    filterAble: React.PropTypes.bool,
    groupBy: React.PropTypes.string,
    mult: React.PropTypes.bool,
    onChange: React.PropTypes.func,
    optionTpl: React.PropTypes.string,
    placeholder: React.PropTypes.string,
    readOnly: React.PropTypes.bool,
    resultTpl: React.PropTypes.string,
    sep: React.PropTypes.string,
    value: React.PropTypes.any,
    valueTpl: React.PropTypes.string
  }

  static defaultProps = {
    dropup: false,
    sep: ',',
    optionTpl: '{text}',
    valueTpl: '{id}'
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setValue(this.formatValue(nextProps.value))
    }
    if (nextProps.data !== this.props.data) {
      this.setState({ data: this.formatData(nextProps.data) })
    }
  }

  componentClickAway () {
    this.close()
  }

  state = {
    active: false,
    value: this.formatValue(this.props.value),
    data: this.formatData(this.props.data, this.formatValue(this.props.value)),
    filter: ''
  }

  open () {
    if (!this.state.active && !this.props.readOnly) {
      let options = React.findDOMNode(this.refs.options)
      options.style.display = 'block'
      let offset = getOuterHeight(options) + 5

      let el = React.findDOMNode(this)
      let dropup = overView(el, offset)

      withoutTransition(el, () => {
        this.setState({ dropup })
      })

      this.bindClickAway()

      setTimeout(() => {
        this.setState({ filter: '', active: true })
      }, 0)
    }
  }

  close () {
    this.setState({ active: false })
    this.unbindClickAway()
    // use setTimeout instead of transitionEnd
    setTimeout(() => {
      if (this.state.active === false) {
        React.findDOMNode(this.refs.options).style.display = 'none'
      }
    }, 500)
  }

  getValue (sep = this.props.sep, data = this.state.data) {
    let value = []
    data.forEach(d => {
      if (d.$checked) {
        value.push(d.$value)
      }
    })

    if (sep) {
      value = value.join(sep)
    }

    return value
  }

  setValue (value) {
    this.setState({ value: this.formatValue(value) })
  }

  formatValue (value) {
    value = toArray(value, this.props.sep)
    if (this.state) {
      //let data = clone(this.state.data).map(d => {
      let data = this.state.data.map(d => {
        d.$checked = value.indexOf(d.$value) >= 0
        return d
      })
      this.setState({ data: data })
    }
    return value
  }

  formatData (data, value = this.state.value) {
    if (typeof data === 'function') {
      data(res => {
        this.setState({ data: this.formatData(res) })
      })
      return []
    }

    data = data.map(d => {
      if (typeof d !== 'object') {
        return {
          $option: d,
          $result: d,
          $value: d,
          $filter: d,
          $checked: value.indexOf(d) >= 0
        }
      }

      // speed filter
      if (this.props.filterAble) {
        d.$filter = (Object.keys(d).map(k => d[k])).join(',').toLowerCase()
      }

      let val = substitute(this.props.valueTpl, d)
      d.$option = substitute(this.props.optionTpl, d)
      d.$result = substitute(this.props.resultTpl || this.props.optionTpl, d)
      d.$value = val
      d.$checked = value.indexOf(val) >= 0
      return d
    })

    if (this.props.groupBy) {
      let groups = {},
          groupBy = this.props.groupBy
      data.forEach(d => {
        let key = d[groupBy]
        if (!groups[key]) {
          groups[key] = []
        }
        groups[key].push(d)
      })
      data = []
      Object.keys(groups).forEach(k => {
        data.push(k)
        data = data.concat(groups[k])
      })
    }

    return data
  }

  handleChange (i) {
    if (this.props.readOnly) {
      return
    }

    let data = this.state.data
    if (this.props.mult) {
      data[i].$checked = !data[i].$checked
      this.setState({ data })
    } else {
      data.map(d => {
        if (typeof d !== 'string') {
          d.$checked = false
        }
      })
      data[i].$checked = true
      this.setState({ data })
      this.close()
    }
    if (this.props.onChange) {
      let value = this.getValue(this.props.sep, data)
      setTimeout(() => {
        this.props.onChange(value)
      }, 0)
    }
  }

  handleRemove (i) {
    // wait checkClickAway completed
    setTimeout(() => {
      this.handleChange(i)
    }, 0)
  }

  render () {
    let active = this.state.active
    let result = []

    let className = classnames(
      this.getGrid(),
      'select form-control',
      {
        active: active,
        readonly: this.props.readOnly,
        dropup: this.state.dropup,
        single: !this.props.mult
      }
    )

    let placeholder = this.state.msg || this.props.placeholder

    let filter = this.props.filterAble ?
                 (<div className="filter">
                    <i className="search" />
                    <input value={this.state.filter}
                      onChange={ e=>this.setState({ filter: e.target.value }) }
                      type="text" />
                  </div>) :
                 null

    let filterText = this.state.filter ?
                     this.state.filter.toLowerCase() :
                     null

    let options = this.state.data.map(function (d, i) {
      if (typeof d === 'string') {
        return <span key={i} className="show group">{d}</span>
      }

      if (d.$checked) {
        if (this.props.mult) {
          result.push(
            <div key={i} className="result"
              onClick={this.handleRemove.bind(this, i)}
              dangerouslySetInnerHTML={{__html: d.$result}}
            />
          )
        } else {
          result.push(<span key={i} dangerouslySetInnerHTML={{__html: d.$result}} />)
        }
      }
      let optionClassName = classnames({
        active: d.$checked,
        show: filterText ? d.$filter.indexOf(filterText) >= 0 : true
      })
      return (
        <li key={i}
          onClick={this.handleChange.bind(this, i)}
          className={ optionClassName }
          dangerouslySetInnerHTML={{__html: d.$option}}
        />
      )
    }, this)

    return (
      <div onClick={this.open.bind(this)} className={className}>
        { result.length > 0 ? result : <span className="placeholder">{placeholder}&nbsp;</span> }
        <div className="options-wrap">
          <hr />
          <div ref="options" className="options">
            {filter}
            <ul>{options}</ul>
          </div>
        </div>
      </div>
    )
  }
}

export default Select

require('./formControl.jsx').register(

  'select',

  function (props) {
    return <Select {...props} />
  },

  Select,

  'array'
)
