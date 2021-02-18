import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { withAuthenticator } from 'aws-amplify-react'
import Amplify, { API, Auth, Storage } from 'aws-amplify';
import aws_exports from './aws-exports';
import { RekognitionClient, CompareFacesCommand, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import Predictions, { AmazonAIPredictionsProvider } from '@aws-amplify/predictions';
import { repeat } from 'lodash';
import Table from 'react-bootstrap/Table'
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
Amplify.configure(aws_exports);
Amplify.addPluggable(new AmazonAIPredictionsProvider());


const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));



class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      file: null,
      label: null,
      rateButtonsVisible: false,
      userId: null,
      userStats: [],
      globalStats: [],
      showStats: false,
      showImage: false,
      showFileInput: true,
      isLoading: false,
      id: "none",
      imgWidth: "40%"
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleRate = this.handleRate.bind(this)
  }



  handleRate(data) {
    // save to dynamo db
    // store in s3 bucket

    this.setState({ imgWidth: "20%" });

    const payload = {
      body: {
        id: this.state.id,
        correct: data,
        label: this.state.label,
        user: this.state.userId
      }
    };

    API.post('matterhorn', '/rate', payload)
      .then(response => {

        var userStats = this.getStats(response.data.Items.filter(item => item.user == this.state.userId));
        var globalStats = this.getStats(response.data.Items);

        this.setState({ userStats: userStats });
        this.setState({ globalStats: globalStats });
        this.setState({ showStats: true });
        this.setState({ rateButtonsVisible: false });


        console.log(userStats);
        console.log(globalStats);

      })
      .catch(error => {
        console.log(error);
      });

    // display stats
  }

  getUserStats(response) {
    var userStats = []
    var responseData = response.data;
    responseData.Items.forEach(element => {
      if (element.user == this.state.userId) {
        userStats.push(element);
      }
    });
    return userStats;
  }

  getStats(items) {

    var stats = []
    var carStats = { label: "car", correct: 0, incorrect: 0, total: 0 }
    var humanStats = { label: "human", correct: 0, incorrect: 0, total: 0 }
    var animalStats = { label: "animal", correct: 0, incorrect: 0, total: 0 }
    var natureStats = { label: "nature", correct: 0, incorrect: 0, total: 0 }
    var undefinedStats = { label: "undefined", correct: 0, incorrect: 0, total: 0 }


    items.forEach(element => {
      if (element.label == "Car") {
        if (element.correct) {
          carStats.correct = carStats.correct + 1;
        } else {
          carStats.incorrect = carStats.incorrect + 1;
        }
        carStats.total = carStats.total + 1;
      }
    });

    items.forEach(element => {
      if (element.label == "Human") {
        if (element.correct) {
          humanStats.correct = humanStats.correct + 1;
        } else {
          humanStats.incorrect = humanStats.incorrect + 1;
        }
        humanStats.total = humanStats.total + 1;
      }
    });

    items.forEach(element => {
      if (element.label == "Animal") {
        if (element.correct) {
          animalStats.correct = animalStats.correct + 1;
        } else {
          animalStats.incorrect = animalStats.incorrect + 1;
        }
        animalStats.total = animalStats.total + 1;
      }
    });

    items.forEach(element => {
      if (element.label == "Nature") {
        if (element.correct) {
          natureStats.correct = natureStats.correct + 1;
        } else {
          natureStats.incorrect = natureStats.incorrect + 1;
        }
        natureStats.total = natureStats.total + 1;
      }
    });

    items.forEach(element => {
      if (element.label == "Undefined") {
        if (element.correct) {
          undefinedStats.correct = undefinedStats.correct + 1;
        } else {
          undefinedStats.incorrect = undefinedStats.incorrect + 1;
        }
        undefinedStats.total = undefinedStats.total + 1;
      }
    });

    stats.push(carStats)
    stats.push(humanStats)
    stats.push(animalStats)
    stats.push(natureStats)
    stats.push(undefinedStats)


    return stats;
  }

  handleChange(event) {

    var id = (Math.floor(Math.random() * 10000000000) + 1).toString()

    this.setState({ id: id });
    this.setState({ showImage: true });
    this.setState({ showFileInput: false });
    this.setState({ isLoading: true });
    this.setState({ showLabel: true });


    Auth.currentUserInfo().then(data => {
      this.setState({ userId: data["username"] })
    });

    this.setState({
      file: URL.createObjectURL(event.target.files[0])
    })

    const file = event.target.files[0];
    this.setState({ showStats: false });


    const allowedLabels = ["Nature", "Car", "Human", "Animal"];

    Predictions.identify({
      labels: {
        source: {
          file,
        },
        type: "LABELS"
      }
    })
      .then(response => {
        const { labels } = response;

        var currentLabel = "undefined";
        var currentConfidence = 0.5;

        allowedLabels.forEach(allowedLabel => {
          labels.forEach(object => {
            console.log(object)
            var confidence = object.metadata.confidence;
            if (allowedLabel == object.name && currentConfidence < confidence) {
              currentConfidence = object.metadata.confidence;
              currentLabel = object.name;
            }
          })
        })

        this.setState({ label: currentLabel })
        this.setState({ rateButtonsVisible: true })
        this.setState({ isLoading: false });



        Storage.put(this.state.label + "/" + this.state.id, file, {
          contentType: 'image/jpeg'
        })
          .then(result => console.log(result))
          .catch(err => console.log(err));

      })
      .catch(err => console.log({ err }));
  }

  render() {

    return (
      <div className="App">
        <header className="App-header">

          {this.state.showImage &&
            <img width={this.state.imgWidth} src={this.state.file} />
          }
          {this.state.showFileInput &&
            <div id="box">
              <div width="100%" height="100%" class="dropZoneOverlay">Drag and drop your image <br /><br />or<br /><br />Click to add</div>
              <input type="file" id="file" onChange={this.handleChange} />
            </div>

          }

          {this.state.showLabel &&
            <h1>{"Label: " + (this.state.isLoading ? "loading" : this.state.label)}</h1>
          }

          {this.state.rateButtonsVisible &&

            <div style={{ flexGrow: 1 }}>
              <Grid container direction="row" spacing={3}>
                <Grid item xm={4}>
                  <Button variant="contained" color="primary" onClick={() => this.handleRate(true)}>Correct</Button>
                </Grid>
                <Grid item xs={4}>
                  <Button variant="contained" color="secondary" onClick={() => this.handleRate(false)}>Wrong</Button>
                </Grid>

              </Grid>
            </div>

            // <div>
            //   <div>
            //     <Button variant="contained" color="primary" onClick={() => this.handleRate(true)}>Yes</Button>
            //   </div>
            //   <div>
            //     <Button variant="contained" color="secondary" onClick={() => this.handleRate(false)}>No</Button>
            //   </div>
            // </div>
          }

          {this.state.showStats &&


            <div style={{ flexGrow: 1 }}>
              <Grid container direction="row" spacing={3}>
                <Grid item xm={6}>
                  <h1>User Stats</h1>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Correct</th>
                        <th>Incorrect</th>
                        <th>Total</th>


                      </tr>
                    </thead>
                    <tbody>
                      {this.state.userStats.map((d, index) => (
                        <tr key={index}>
                          <td >{d.label}</td>
                          <td >{d.correct}</td>
                          <td >{d.incorrect}</td>
                          <td >{d.total}</td>

                        </tr>
                      ))}
                    </tbody>
                  </Table>

                </Grid>
                <Grid item xs={6}>
                  <h1>Global Stats</h1>

                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Correct</th>
                        <th>Incorrect</th>
                        <th>Total</th>


                      </tr>
                    </thead>
                    <tbody>
                      {this.state.globalStats.map((d, index) => (
                        <tr key={index}>
                          <td >{d.label}</td>
                          <td >{d.correct}</td>
                          <td >{d.incorrect}</td>
                          <td >{d.total}</td>

                        </tr>
                      ))}
                    </tbody>
                  </Table>        </Grid>

              </Grid>
            </div>


          }




        </header>
      </div>

    );
  }



}

export default withAuthenticator(App, true);
