import React, { Component } from 'react'

class Table extends Component {
   constructor(props) {
      super(props) //since we are extending class Table so we have to use super in order to override Component class constructor
      this.state = { //state is by default an object
         students: []
      }
   }

   renderTableData() {
    return this.state.students.map((student, index) => {
       const { id, name, age, email } = student //destructuring
       return (
          <tr key={id}>
             <td>{id}</td>
             <td>{name}</td>
             <td>{age}</td>
             <td>{email}</td>
          </tr>
       )
    })
 }

 renderTableHeader() {
    let header = Object.keys(this.state.students[0])
    return header.map((key, index) => {
       return <th key={index}>{key}</th>
    })
 }

 render() {
    return (
       <div>
          <table id='students'>
             <tbody>
                <tr>{this.renderTableHeader()}</tr>
                {this.renderTableData()}
             </tbody>
          </table>
       </div>
    )
 }
}

export default Table //exporting a component make it reusable and this is 